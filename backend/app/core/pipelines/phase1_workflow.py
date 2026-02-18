"""
Phase 1 Workflows — FIXED

Changes:
  analyze_user_dumps()        — was `pass`, now reads each file and runs the
                                 PastProjectsSpecAnalyzer agent on it.
  find_and_analyze_projects() — was `pass`, now runs ProjectFinder (web search)
                                 then ProjectAnalyzer on each URL found.
"""

from __future__ import annotations

import os
from typing import List

from agents import Agent, Runner, WebSearchTool
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
    """
    Read text from a .docx or plain-text file.
    Returns up to `max_chars` characters so we don't blow the context window.
    """
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
# Stream 3 — Web Resource Discovery (unchanged, already working)
# ---------------------------------------------------------------------------

async def discover_resources(
    research_topic: str,
    guidelines: ProjectGuidelines,
    num_searches: int = 5,
) -> DiscoveredResources:
    """Discover datasets, methods, tools, and papers via adaptive web search."""

    print("\n🔍 RESOURCE DISCOVERY (Adaptive)")
    print("-" * 80)
    print(f"   Project type: {guidelines.project_type}")

    search_queries: List[str] = []
    search_queries.append(f"{research_topic} recent research papers 2024 2025")

    if guidelines.requires_dataset and num_searches > 1:
        search_queries.append(f"{research_topic} datasets Kaggle UCI")
    if guidelines.requires_methods and num_searches > 3:
        search_queries.append(f"{research_topic} methods techniques")
    if guidelines.requires_tools and num_searches > 4:
        search_queries.append(f"{research_topic} tools libraries frameworks")

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
        print(
            f"   Datasets: {len(resources.datasets)}, Methods: {len(resources.methods)}"
        )
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
# Stream 1 — User-Provided Dumps  (FIXED — was `pass`)
# ---------------------------------------------------------------------------

async def analyze_user_dumps(
    dump_files: List[str],
    research_topic: str,
) -> List[AnalyzedProjectSpecSections]:
    """
    Analyse user-uploaded past project files using the
    PastProjectsSpecAnalyzer agent.

    Each file is read, truncated to 20 000 chars, and sent to the agent
    which extracts it into AnalyzedProjectSpecSections format.
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
# Stream 2 — Auto-Discovery  (FIXED — was `pass`)
# ---------------------------------------------------------------------------

async def find_and_analyze_projects(
    research_topic: str,
    guidelines: ProjectGuidelines,
    num_projects: int = 3,
) -> List[AnalyzedProjectSpecSections]:
    """
    Auto-discover and analyse similar student projects via web search.

    Step 1: ProjectFinder agent searches the web for project URLs.
    Step 2: For each URL, ProjectAnalyzer agent fetches and analyses it.
    """

    print(f"\n🤖 Auto-discovering up to {num_projects} similar project(s)…")

    # --- Step 1: Find candidate URLs ---
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
        urls_raw: str = str(finder_result.final_output)
        print(f"   ProjectFinder output:\n{urls_raw[:500]}…")

    except Exception as exc:
        print(f"   ❌ ProjectFinder failed: {exc}")
        return []

    # Extract URLs from the finder output (simple line scan)
    candidate_urls: List[str] = []
    for line in urls_raw.splitlines():
        line = line.strip()
        if line.startswith("http://") or line.startswith("https://"):
            candidate_urls.append(line.split()[0])  # take first token (the URL)
        elif "http" in line:
            # Try to pull URL out of a prose sentence
            for token in line.split():
                if token.startswith("http"):
                    candidate_urls.append(token.rstrip(".,)>\"'"))
                    break

    # Deduplicate and limit
    seen: set[str] = set()
    unique_urls: List[str] = []
    for u in candidate_urls:
        if u not in seen:
            seen.add(u)
            unique_urls.append(u)
    unique_urls = unique_urls[: num_projects + 2]

    if not unique_urls:
        print("   ⚠️  No valid URLs extracted from ProjectFinder output")
        return []

    print(f"   Found {len(unique_urls)} candidate URL(s) to analyse")

    # --- Step 2: Analyse each URL ---
    analyzed_projects: List[AnalyzedProjectSpecSections] = []

    for idx, url in enumerate(unique_urls, 1):
        if len(analyzed_projects) >= num_projects:
            break

        print(f"\n   🔎 [{idx}/{len(unique_urls)}] Analysing: {url[:80]}…")

        try:
            result = await Runner.run(
                starting_agent=project_analyzer_agent,
                input=f"""
Fetch and analyse this project document.

URL: {url}
Research Topic Context: {research_topic}
Source Stream: auto_discovered

Extract all information into AnalyzedProjectSpecSections format.
Pay special attention to: methodology, datasets, limitations, future work.
""",
            )
            analyzed: AnalyzedProjectSpecSections = result.final_output
            analyzed_projects.append(analyzed)
            print(f"      ✅ {analyzed.project_title[:60]}")

        except Exception as exc:
            print(f"      ❌ Analysis failed: {exc}")

    print(f"\n✅ Stream 2 complete: {len(analyzed_projects)} project(s) analysed")
    return analyzed_projects