"""
Phase 1 Workflows

Extracted from: Notebook Cells 6, 9-12
Purpose: 3-stream resource discovery pipeline
"""

from typing import List
from agents import Agent, Runner, WebSearchTool
from app.models.guidelines import ProjectGuidelines
from app.models.resources import DiscoveredResources
from app.models.projects import AnalyzedProjectSpecSections
from app.core.agents.definitions.phase1_agents import (
    resource_finder_agent,
    web_search_agent,
    project_finder_agent,
    project_analyzer_agent,
    past_projects_spec_analyzer_agent
)


async def discover_resources(
    research_topic: str,
    guidelines: ProjectGuidelines,
    num_searches: int = 5
) -> DiscoveredResources:
    """
    Discover resources via adaptive web search
    
    Searches are ADAPTIVE based on project type from guidelines
    """
    
    print("\n🔍 RESOURCE DISCOVERY (Adaptive)")
    print("-" * 80)
    print(f"   Project type: {guidelines.project_type}")
    
    search_results = []
    search_queries = []
    
    # Always search for papers
    search_queries.append(f"{research_topic} recent research papers 2024 2025")
    
    # Conditional searches
    if guidelines.requires_dataset and num_searches > 1:
        search_queries.append(f"{research_topic} datasets Kaggle UCI")
    if guidelines.requires_methods and num_searches > 3:
        search_queries.append(f"{research_topic} methods techniques")
    if guidelines.requires_tools and num_searches > 4:
        search_queries.append(f"{research_topic} tools libraries frameworks")
    
    search_queries = search_queries[:num_searches]
    
    try:
        for i, query in enumerate(search_queries, 1):
            print(f"   Search {i}/{len(search_queries)}: {query[:60]}...")
            
            result = await Runner.run(
                starting_agent=web_search_agent,
                input=f"Search the web for: {query}"
            )
            
            search_results.append({
                "query": query,
                "results": str(result.final_output)
            })
        
        compiled_results = "\n\n".join([
            f"QUERY: {sr['query']}\nRESULTS:\n{sr['results']}\n{'-'*80}"
            for sr in search_results
        ])
        
        extraction_result = await Runner.run(
            starting_agent=resource_finder_agent,
            input=f"""
Research Topic: {research_topic}
Project Type: {guidelines.project_type}

Web Search Results:
{compiled_results}

Extract and structure all relevant resources found in these search results.
"""
        )
        
        resources = extraction_result.final_output
        
        print(f"\n✅ Resource discovery complete")
        print(f"   Datasets: {len(resources.datasets)}, Methods: {len(resources.methods)}")
        print(f"   Tools: {len(resources.tools)}, Papers: {len(resources.papers)}")
        
        return resources
        
    except Exception as e:
        print(f"❌ Error during resource discovery: {e}")
        return DiscoveredResources(
            datasets=[], methods=[], tools=[], papers=[],
            search_summary="Resource discovery encountered errors."
        )


async def find_and_analyze_projects(
    research_topic: str,
    guidelines: ProjectGuidelines,
    num_projects: int = 3
) -> List[AnalyzedProjectSpecSections]:
    """Auto-discover and analyze similar projects"""
    # Implementation from Cell 9-11
    pass


async def analyze_user_dumps(
    dump_files: List[str],
    research_topic: str
) -> List[AnalyzedProjectSpecSections]:
    """Analyze user-provided project dumps"""
    # Implementation from Cell 12
    pass
