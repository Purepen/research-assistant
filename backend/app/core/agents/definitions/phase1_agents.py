"""
Phase 1 Agent Definitions

Extracted from: Notebook Cells 6, 9, 11, 12
Purpose: Define agents for 3-stream resource discovery pipeline
"""

from agents import Agent, WebSearchTool
from app.models.resources import DiscoveredResources
from app.models.projects import AnalyzedProjectSpecSections
from app.core.agents.instructions.phase1_resource_discovery import RESOURCE_FINDER_INSTRUCTIONS
from app.core.agents.instructions.phase1_project_finder import PROJECT_FINDER_INSTRUCTIONS
from app.core.agents.instructions.phase1_project_analyzer import PROJECT_ANALYZER_INSTRUCTIONS
from app.core.agents.instructions.phase1_past_projects import PAST_PROJECTS_SPEC_ANALYZER_INSTRUCTIONS


# Resource Finder Agent (Cell 6)
resource_finder_agent = Agent(
    name="ResourceFinder",
    instructions=RESOURCE_FINDER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=DiscoveredResources
)

# Web Search Agent (Cell 6 - helper agent)
web_search_agent = Agent(
    name="WebSearcher",
    instructions="Perform web searches to find relevant resources.",
    model="gpt-4o-mini",
    tools=[WebSearchTool()]
)

# Project Finder Agent (Cell 9)
project_finder_agent = Agent(
    name="ProjectFinder",
    instructions=PROJECT_FINDER_INSTRUCTIONS,
    model="gpt-4o",
    tools=[WebSearchTool()]
)

# Project Analyzer Agent (Cell 11)
project_analyzer_agent = Agent(
    name="ProjectAnalyzer",
    instructions=PROJECT_ANALYZER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=AnalyzedProjectSpecSections
)

# Past Projects Spec Analyzer Agent (Cell 12)
past_projects_spec_analyzer_agent = Agent(
    name="PastProjectsSpecAnalyzer",
    instructions=PAST_PROJECTS_SPEC_ANALYZER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=AnalyzedProjectSpecSections
)
