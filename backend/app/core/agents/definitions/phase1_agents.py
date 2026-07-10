"""
Phase 1 Agent Definitions

Model assignments:
  gpt-4o-mini  →  web_search_agent (simple search)
                  project_finder_agent (just finds URLs — no complex reasoning needed)
  gpt-4o       →  resource_finder_agent (structured extraction from raw results)
                  project_analyzer_agent (deep analysis of project documents)
                  past_projects_spec_analyzer_agent (deep analysis of user uploads)
"""

from agents import Agent, WebSearchTool
from app.models.resources import DiscoveredResources
from app.models.projects import AnalyzedProjectSpecSections, ProjectFinderOutput
from app.core.agents.instructions.phase1_resource_discovery import RESOURCE_FINDER_INSTRUCTIONS
from app.core.agents.instructions.phase1_project_finder import PROJECT_FINDER_INSTRUCTIONS
from app.core.agents.instructions.phase1_project_analyzer import PROJECT_ANALYZER_INSTRUCTIONS
from app.core.agents.instructions.phase1_past_projects import PAST_PROJECTS_SPEC_ANALYZER_INSTRUCTIONS


# Web Search Agent — mini: just performs searches
web_search_agent = Agent(
    name="WebSearcher",
    instructions="Perform web searches to find relevant resources.",
    model="gpt-4o-mini",
    tools=[WebSearchTool()]
)

# Resource Finder Agent — gpt-4o: structured extraction across multiple result types
resource_finder_agent = Agent(
    name="ResourceFinder",
    instructions=RESOURCE_FINDER_INSTRUCTIONS,
    model="gpt-4o-mini",
    output_type=DiscoveredResources
)

# Project Finder Agent — mini: just finds and returns project URLs
project_finder_agent = Agent(
    name="ProjectFinder",
    instructions=PROJECT_FINDER_INSTRUCTIONS,
    model="gpt-4o-mini",
    tools=[WebSearchTool()],
    output_type=ProjectFinderOutput,
)

# Project Analyzer Agent — gpt-4o: deep extraction of project details
project_analyzer_agent = Agent(
    name="ProjectAnalyzer",
    instructions=PROJECT_ANALYZER_INSTRUCTIONS,
    model="gpt-4o-mini",
    output_type=AnalyzedProjectSpecSections
)

# Past Projects Spec Analyzer Agent — gpt-4o: deep analysis of user-uploaded docs
past_projects_spec_analyzer_agent = Agent(
    name="PastProjectsSpecAnalyzer",
    instructions=PAST_PROJECTS_SPEC_ANALYZER_INSTRUCTIONS,
    model="gpt-4o-mini",
    output_type=AnalyzedProjectSpecSections
)


# ── Factory function — model-tier-aware ───────────────────────────────────────

def build_phase1_agents(config: "AgentModelConfig") -> dict:  # type: ignore[name-defined]
    """
    Build Phase 1 discovery agents using the user's AgentModelConfig.

    Called by the pipeline when a per-user model config is available.
    Returns a dict keyed by role name — the same keys _resolve_phase1_agents()
    in phase1_workflow.py uses for the module-level singletons.
    """
    from app.models.agent_config import AgentKey

    return {
        "web_searcher": Agent(
            name="WebSearcher",
            instructions="Perform web searches to find relevant resources.",
            model=config.get(AgentKey.WEB_SEARCHER),
            tools=[WebSearchTool()],
        ),
        "resource_finder": Agent(
            name="ResourceFinder",
            instructions=RESOURCE_FINDER_INSTRUCTIONS,
            model=config.get(AgentKey.RESOURCE_FINDER),
            output_type=DiscoveredResources,
        ),
        "project_finder": Agent(
            name="ProjectFinder",
            instructions=PROJECT_FINDER_INSTRUCTIONS,
            model=config.get(AgentKey.PROJECT_FINDER),
            tools=[WebSearchTool()],
            output_type=ProjectFinderOutput,
        ),
        "project_analyzer": Agent(
            name="ProjectAnalyzer",
            instructions=PROJECT_ANALYZER_INSTRUCTIONS,
            model=config.get(AgentKey.PROJECT_ANALYZER),
            output_type=AnalyzedProjectSpecSections,
        ),
        "past_projects_analyzer": Agent(
            name="PastProjectsSpecAnalyzer",
            instructions=PAST_PROJECTS_SPEC_ANALYZER_INSTRUCTIONS,
            model=config.get(AgentKey.PAST_PROJECTS_ANALYZER),
            output_type=AnalyzedProjectSpecSections,
        ),
    }
