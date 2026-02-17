"""
Phase 2 Workflows

Extracted from: Notebook Cell 8
Purpose: Strategic synthesis from all 3 streams
"""

from typing import Optional, List
from agents import Runner
from app.models.guidelines import ProjectGuidelines
from app.models.resources import DiscoveredResources
from app.models.synthesis import StrategicSynthesis
from app.models.projects import AnalyzedProjectSpecSections
from app.core.agents.definitions.phase2_agents import strategic_synthesizer_agent


async def create_strategic_synthesis(
    research_topic: str,
    discovered_resources: DiscoveredResources,
    analyzed_projects: List[AnalyzedProjectSpecSections],
    guidelines: ProjectGuidelines
) -> StrategicSynthesis:
    """
    Create strategic synthesis from all discovered resources
    """
    
    print("\n🎯 STRATEGIC SYNTHESIS")
    print("-" * 80)
    
    resources_summary = f"""
DISCOVERED RESOURCES:
Datasets ({len(discovered_resources.datasets)}): {', '.join(d.name for d in discovered_resources.datasets[:5])}
Methods ({len(discovered_resources.methods)}): {', '.join(m.name for m in discovered_resources.methods[:5])}
Tools ({len(discovered_resources.tools)}): {', '.join(t.name for t in discovered_resources.tools[:5])}
Papers ({len(discovered_resources.papers)}): {', '.join(p.title[:50] for p in discovered_resources.papers[:5])}
"""
    
    projects_summary = f"\nANALYZED PROJECTS ({len(analyzed_projects)}):\n"
    for proj in analyzed_projects[:3]:
        projects_summary += f"- {proj.project_title}\n"
    
    try:
        result = await Runner.run(
            starting_agent=strategic_synthesizer_agent,
            input=f"""
Create strategic positioning for:

RESEARCH TOPIC: {research_topic}
PROJECT TYPE: {guidelines.project_type}

{resources_summary}
{projects_summary}

Create a strategic synthesis that positions this research uniquely.
"""
        )
        
        synthesis = result.final_output
        
        print(f"✅ Strategic synthesis complete")
        print(f"   Novel contributions: {len(synthesis.novel_contributions)}")
        print(f"   Risks identified: {len(synthesis.risk_factors)}")
        
        return synthesis
        
    except Exception as e:
        print(f"❌ Error creating synthesis: {e}")
        raise
