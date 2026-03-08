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
from app.models.projects import AnalyzedProjectSpecSections
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
    model="gpt-4o",
    output_type=DiscoveredResources
)

# Project Finder Agent — mini: just finds and returns project URLs
project_finder_agent = Agent(
    name="ProjectFinder",
    instructions=PROJECT_FINDER_INSTRUCTIONS,
    model="gpt-4o-mini",
    tools=[WebSearchTool()]
)

# Project Analyzer Agent — gpt-4o: deep extraction of project details
project_analyzer_agent = Agent(
    name="ProjectAnalyzer",
    instructions=PROJECT_ANALYZER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=AnalyzedProjectSpecSections
)

# Past Projects Spec Analyzer Agent — gpt-4o: deep analysis of user-uploaded docs
past_projects_spec_analyzer_agent = Agent(
    name="PastProjectsSpecAnalyzer",
    instructions=PAST_PROJECTS_SPEC_ANALYZER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=AnalyzedProjectSpecSections
)
