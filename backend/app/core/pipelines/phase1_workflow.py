"""
Phase 1 Workflows

Changes in this version:
  discover_resources() — accepts dataset_source param.
                         If dataset_source != 'scout', the dataset search query
                         is skipped entirely — saves 1 web search call + cost.
  analyze_user_dumps()        — reads each file and runs PastProjectsSpecAnalyzer.
  find_and_analyze_projects() — runs ProjectFinder then ProjectAnalyzer per URL.
"""

from __future__ import annotations

import os
from typing import List

from agents import Runner
from docx import Document

from app.models.guidelines import ProjectGuidelines
from app.models.resources import DiscoveredResources
from app.models.projects import AnalyzedProjectSpecSections
from app.core.agents.definitions.phase1_agents import (
    resource_finder_agent,
    web_search_agent,
    project_finder_agent,
    project_analyzer_agent,
    past_projects_spec_analyzer_agent,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_file_text(path: str, max_chars: int = 20_000) -> str:
    """Read text from a .docx or plain-text file, up to max_chars."""
    try:
        if path.lower().endswith(".docx"):
            doc = Document(path)
            text = "\n".join(p.text for p in doc.paragraphs if p.text)
        else:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                text = fh.read()
        return text[:max_chars]
    except Exception as exc:
        print(f"   ⚠️  Could not read {path}: {exc}")
        return ""


# ---------------------------------------------------------------------------
# Stream 3 — Web Resource Discovery
# ---------------------------------------------------------------------------

async def discover_resources(
    research_topic: str,
    guidelines: ProjectGuidelines,
    num_searches: int = 5,
    dataset_source: str = "scout",
) -> DiscoveredResources:
    """
    Discover papers, methods, tools, and (optionally) datasets via web search.

    dataset_source:
      'scout'          → AI searches for a dataset (adds a search call)
      anything else    → dataset search is SKIPPED — student already has one
    """
    print("\n🔍 RESOURCE DISCOVERY (Adaptive)")
    print("-" * 80)
    print(f"   Project type: {guidelines.project_type}")
    print(f"   Dataset source: {dataset_source} "
          f"{'→ will search for dataset' if dataset_source == 'scout' else '→ dataset search SKIPPED'}")

    search_queries: List[str] = []
    search_queries.append(f"{research_topic} recent research papers 2024 2025")

    # Only search for a dataset if the student wants AI to find one
    if guidelines.requires_dataset and num_searches > 1 and dataset_source == "scout":
        search_queries.append(f"{research_topic} datasets Kaggle UCI")
    elif dataset_source != "scout":
        print(f"   ⏭️  Dataset search skipped — student provided own dataset ({dataset_source})")

    if guidelines.requires_methods and num_searches > 3:
        search_queries.append(f"{research_topic} methods techniques algorithms")
    if guidelines.requires_tools and num_searches > 4:
        search_queries.append(f"{research_topic} tools libraries frameworks Python")

    search_queries = search_queries[:num_searches]
    search_results = []

    try:
        for i, query in enumerate(search_queries, 1):
            print(f"   Search {i}/{len(search_queries)}: {query[:70]}...")
            result = await Runner.run(
                starting_agent=web_search_agent,
                input=f"Search the web for: {query}",
            )
            search_results.append({"query": query, "results": str(result.final_output)})

        compiled = "\n\n".join(
            f"QUERY: {sr['query']}\nRESULTS:\n{sr['results']}\n{'-' * 80}"
            for sr in search_results
        )

        extraction_result = await Runner.run(
            starting_agent=resource_finder_agent,
            input=f"""
Research Topic: {research_topic}
Project Type: {guidelines.project_type}

Web Search Results:
{compiled}

Extract and structure all relevant resources found in these search results.
""",
        )

        resources = extraction_result.final_output
        print(f"\n✅ Resource discovery complete")
        print(f"   Datasets: {len(resources.datasets)}, Methods: {len(resources.methods)}")
        print(f"   Tools: {len(resources.tools)}, Papers: {len(resources.papers)}")
        return resources

    except Exception as exc:
        print(f"❌ Error during resource discovery: {exc}")
        return DiscoveredResources(
            datasets=[],
            methods=[],
            tools=[],
            papers=[],
            search_summary="Resource discovery encountered errors.",
        )


# ---------------------------------------------------------------------------
# Stream 1 — User-Provided Dumps
# ---------------------------------------------------------------------------

async def analyze_user_dumps(
    dump_files: List[str],
    research_topic: str,
) -> List[AnalyzedProjectSpecSections]:
    """
    Analyse user-uploaded past project files using PastProjectsSpecAnalyzer.
    Each file is read, truncated to 20,000 chars, and sent to the agent.
    """
    print(f"\n📂 Analysing {len(dump_files)} user-provided file(s)…")
    results: List[AnalyzedProjectSpecSections] = []

    for path in dump_files:
        filename = os.path.basename(path)
        print(f"   📄 Reading: {filename}")

        text = _read_file_text(path)
        if not text.strip():
            print(f"      ⚠️  Empty or unreadable — skipping")
            continue

        try:
            result = await Runner.run(
                starting_agent=past_projects_spec_analyzer_agent,
                input=f"""
Analyse this student project document and extract all information in
AnalyzedProjectSpecSections format.

Source: {filename}
Stream: user_provided

DOCUMENT CONTENT:
{text}
""",
            )
            analyzed: AnalyzedProjectSpecSections = result.final_output
            results.append(analyzed)
            print(f"      ✅ Extracted: {analyzed.project_title[:60]}")

        except Exception as exc:
            print(f"      ❌ Analysis failed for {filename}: {exc}")

    print(f"\n✅ Stream 1 complete: {len(results)} project(s) analysed")
    return results


# ---------------------------------------------------------------------------
# Stream 2 — Auto-Discovery
# ---------------------------------------------------------------------------

async def find_and_analyze_projects(
    research_topic: str,
    guidelines: ProjectGuidelines,
    num_projects: int = 3,
) -> List[AnalyzedProjectSpecSections]:
    """
    Auto-discover and analyse similar student projects via web search.
    Step 1: ProjectFinder searches for URLs.
    Step 2: ProjectAnalyzer fetches and analyses each URL.
    """
    print(f"\n🤖 Auto-discovering up to {num_projects} similar project(s)…")

    # Step 1: Find candidate URLs
    try:
        finder_result = await Runner.run(
            starting_agent=project_finder_agent,
            input=f"""
Find {num_projects + 2} complete student project documents related to:
RESEARCH TOPIC: {research_topic}
ACADEMIC LEVEL: {guidelines.project_type}

Search for MSc/BSc theses, dissertations, and detailed project reports.
Return a list of URLs with confidence ratings.
""",
        )
        candidate_urls = finder_result.final_output
        if not candidate_urls or not candidate_urls.project_urls:
            print("   ⚠️  No project URLs found")
            return []
        print(f"   Found {len(candidate_urls.project_urls)} candidate URL(s)")
    except Exception as exc:
        print(f"   ❌ Project finder failed: {exc}")
        return []

    # Step 2: Analyse each URL
    analyzed: List[AnalyzedProjectSpecSections] = []
    for url_entry in candidate_urls.project_urls[:num_projects + 2]:
        if len(analyzed) >= num_projects:
            break
        try:
            url = url_entry.url if hasattr(url_entry, "url") else str(url_entry)
            print(f"   🔍 Analysing: {url[:80]}...")
            analysis_result = await Runner.run(
                starting_agent=project_analyzer_agent,
                input=f"""
Fetch and analyse this student project:
URL: {url}
RESEARCH TOPIC: {research_topic}

Extract all available information into AnalyzedProjectSpecSections format.
Stream: auto_discovered
""",
            )
            project = analysis_result.final_output
            analyzed.append(project)
            print(f"      ✅ {project.project_title[:60]}")
        except Exception as exc:
            print(f"      ❌ Failed to analyse {url[:60]}: {exc}")

    print(f"\n✅ Stream 2 complete: {len(analyzed)} project(s) analysed")
    return analyzed
