"""
Phase 1 Workflows

Changes in this version:
  discover_resources() — accepts dataset_source param.
                         If dataset_source != 'scout', the dataset search query
                         is skipped entirely — saves 1 web search call + cost.
  analyze_user_dumps()        — reads each file and runs PastProjectsSpecAnalyzer.
  find_and_analyze_projects() — runs ProjectFinder then ProjectAnalyzer per URL.

Model Tier Addition (Apr 2026):
  All three functions now accept an optional agent_model_config parameter.
  When present, tier-aware agents are built via build_phase1_agents() and used
  instead of the module-level singletons. When None, existing behaviour unchanged.
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
# Helpers — UNCHANGED
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
# Tier agent resolver — NEW
# ---------------------------------------------------------------------------

def _resolve_phase1_agents(agent_model_config=None) -> dict:
    """
    Return a dict of agents to use for Phase 1.
    When agent_model_config is present, builds tier-aware agents via factory.
    When None, returns module-level singletons unchanged.
    """
    if agent_model_config is None:
        return {
            "web_searcher":          web_search_agent,
            "resource_finder":       resource_finder_agent,
            "project_finder":        project_finder_agent,
            "project_analyzer":      project_analyzer_agent,
            "past_projects_analyzer": past_projects_spec_analyzer_agent,
        }

    # No try/except here: a user paying for a model tier must get it or see
    # the failure — silently downgrading to defaults was Bug #2.
    from app.core.agents.definitions.phase1_agents import build_phase1_agents
    from app.models.agent_config import AgentKey

    agents = build_phase1_agents(agent_model_config)
    print(f"   🤖 Phase 1 model: {agent_model_config.get(AgentKey.WEB_SEARCHER)}")
    return agents


# ---------------------------------------------------------------------------
# Stream 3 — Web Resource Discovery
# ---------------------------------------------------------------------------

async def discover_resources(
    research_topic: str,
    guidelines: ProjectGuidelines,
    num_searches: int = 5,
    dataset_source: str = "scout",
    agent_model_config=None,   # NEW — Optional[AgentModelConfig]
) -> DiscoveredResources:
    """
    Discover papers, methods, tools, and (optionally) datasets via web search.

    agent_model_config: when present, uses tier-aware web_search and
      resource_finder agents. When None, uses module-level singletons.
    """

    _agents = _resolve_phase1_agents(agent_model_config)
    _web_search_agent    = _agents["web_searcher"]
    _resource_finder_agent = _agents["resource_finder"]

    print("\n🌐 RESOURCE DISCOVERY")
    print(f"   Topic: {research_topic[:60]}...")
    print(f"   Searches: {num_searches} | Dataset source: {dataset_source}")
    print("-" * 60)

    search_queries = [
        f"{research_topic} machine learning research papers",
        f"{research_topic} datasets publicly available",
        f"{research_topic} methodology algorithms comparison",
        f"{research_topic} MSc BSc dissertation project",
        f"{research_topic} evaluation metrics benchmarks",
    ]

    # Skip dataset search if user already has a dataset
    if dataset_source != "scout":
        search_queries = [q for q in search_queries if "dataset" not in q.lower()]
        print("   ⏭️  Skipping dataset search (user has a dataset)")

    search_queries = search_queries[:num_searches]

    all_results = []
    for i, query in enumerate(search_queries, 1):
        print(f"   [{i}/{len(search_queries)}] {query[:60]}...")
        try:
            result = await Runner.run(
                starting_agent=_web_search_agent,
                input=query,
            )
            all_results.append(result.final_output)
        except Exception as exc:
            print(f"      ⚠️  Search failed: {exc}")

    print(f"\n   Extracting structured resources from {len(all_results)} search result(s)...")
    combined_results = "\n\n".join(str(r) for r in all_results)

    try:
        extraction_result = await Runner.run(
            starting_agent=_resource_finder_agent,
            input=f"""
Extract all structured resources from these search results for:
RESEARCH TOPIC: {research_topic}

SEARCH RESULTS:
{combined_results}

Extract into DiscoveredResources format with datasets, methods, tools, and papers.
""",
        )
        resources: DiscoveredResources = extraction_result.final_output

        print("\n✅ Resource Discovery complete:")
        print(f"   Papers:   {len(resources.papers)}")
        print(f"   Datasets: {len(resources.datasets)}")
        print(f"   Methods:  {len(resources.methods)}")
        print(f"   Tools:    {len(resources.tools)}")

        return resources

    except Exception as exc:
        print(f"❌ Resource extraction failed: {exc}")
        raise


# ---------------------------------------------------------------------------
# Stream 1 — User-Provided Dumps
# ---------------------------------------------------------------------------

async def analyze_user_dumps(
    dump_files: List[str],
    research_topic: str,
    agent_model_config=None,   # NEW — Optional[AgentModelConfig]
) -> List[AnalyzedProjectSpecSections]:
    """
    Analyse user-uploaded past project files using PastProjectsSpecAnalyzer.
    Each file is read, truncated to 20,000 chars, and sent to the agent.

    agent_model_config: when present, uses tier-aware past_projects_analyzer.
    """

    _agents = _resolve_phase1_agents(agent_model_config)
    _past_analyzer = _agents["past_projects_analyzer"]

    print(f"\n📂 Analysing {len(dump_files)} user-provided file(s)…")
    results: List[AnalyzedProjectSpecSections] = []

    for path in dump_files:
        filename = os.path.basename(path)
        print(f"   📄 Reading: {filename}")

        text = _read_file_text(path)
        if not text.strip():
            print("      ⚠️  Empty or unreadable — skipping")
            continue

        try:
            result = await Runner.run(
                starting_agent=_past_analyzer,
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
    agent_model_config=None,   # NEW — Optional[AgentModelConfig]
) -> List[AnalyzedProjectSpecSections]:
    """
    Auto-discover and analyse similar student projects via web search.
    Step 1: ProjectFinder searches for URLs.
    Step 2: ProjectAnalyzer fetches and analyses each URL.

    agent_model_config: when present, uses tier-aware project_finder and
      project_analyzer agents.
    """

    _agents = _resolve_phase1_agents(agent_model_config)
    _project_finder   = _agents["project_finder"]
    _project_analyzer = _agents["project_analyzer"]

    print(f"\n🤖 Auto-discovering up to {num_projects} similar project(s)…")

    # Step 1: Find candidate URLs
    try:
        finder_result = await Runner.run(
            starting_agent=_project_finder,
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
                starting_agent=_project_analyzer,
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