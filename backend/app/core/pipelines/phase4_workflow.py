"""
Phase 4 Workflows

Extracted from: Notebook Cell 19
Purpose: Orchestrate 8 specialist agents and format final specification
"""

from agents import Runner
from app.models.specification import ProjectSpecification
from app.models.guidelines import ProjectGuidelines
from app.models.synthesis import StrategicSynthesis
from app.models.resources import DiscoveredResources
from app.core.agents.definitions.phase4_agents import (
    specification_orchestrator,
    specification_formatter
)


def create_context_for_agents(
    research_topic: str,
    guidelines: ProjectGuidelines,
    discovered_resources: DiscoveredResources,
    strategic_synthesis: StrategicSynthesis,
    feasibility_calibration=None
) -> str:
    """Create comprehensive context string for all specialist agents"""
    
    context = f"""
RESEARCH TOPIC: {research_topic}

PROJECT GUIDELINES:
- Project Type: {guidelines.project_type}
- Timeline: {guidelines.timeline_weeks} weeks
- Target Word Count: {guidelines.target_word_count}
- Citation Style: {guidelines.citation_style}

STRATEGIC SYNTHESIS:
Positioning: {strategic_synthesis.positioning_statement}

Novel Contributions:
{chr(10).join(f"- {c.claim}" for c in strategic_synthesis.novel_contributions)}

Performance Targets: {strategic_synthesis.performance_targets}

Risks:
{chr(10).join(f"- {r}" for r in strategic_synthesis.risk_factors)}

DISCOVERED RESOURCES:
Datasets: {len(discovered_resources.datasets)}
Methods: {len(discovered_resources.methods)}
Tools: {len(discovered_resources.tools)}
Papers: {len(discovered_resources.papers)}
"""
    
    return context


async def generate_specification(
    research_topic: str,
    guidelines: ProjectGuidelines,
    strategic_synthesis: StrategicSynthesis,
    discovered_resources: DiscoveredResources,
    feasibility_calibration=None,
    previous_feedback=None
) -> ProjectSpecification:
    """
    Generate or revise specification using orchestrator + formatter
    
    Args:
        research_topic: The research topic
        guidelines: Parsed guidelines
        strategic_synthesis: Strategic positioning
        discovered_resources: Discovered resources
        feasibility_calibration: Optional feasibility insights
        previous_feedback: Optional feedback for revision
        
    Returns:
        Complete ProjectSpecification
    """
    
    print("\n📝 GENERATING SPECIFICATION")
    print("-" * 80)
    
    # Create agent context
    agent_context = create_context_for_agents(
        research_topic=research_topic,
        guidelines=guidelines,
        discovered_resources=discovered_resources,
        strategic_synthesis=strategic_synthesis,
        feasibility_calibration=feasibility_calibration
    )
    
    # Add word count targets
    word_count_context = f"""

WORD COUNT TARGETS (from guidelines):
{chr(10).join(f"- {s.section_name}: {s.word_count} words" for s in guidelines.sections)}
Total target: {guidelines.target_word_count} words

CRITICAL: Meet these word counts (±20 words per section acceptable).
"""
    
    agent_context += word_count_context
    
    # Add previous feedback if revising
    if previous_feedback:
        agent_context += f"""

PREVIOUS FEEDBACK FOR REVISION:
{previous_feedback}
"""
    
    # Step 1: Orchestrator coordinates specialists
    try:
        print("   Coordinating specialist agents...")
        orchestrator_result = await Runner.run(
            starting_agent=specification_orchestrator,
            input=agent_context
        )
        
        print("   ✅ Orchestration complete")
        
    except Exception as e:
        print(f"   ❌ Orchestration failed: {e}")
        raise
    
    # Step 2: Formatter structures into ProjectSpecification
    try:
        print("   Formatting specification...")
        
        formatter_input = f"""
Research Topic (use EXACTLY as project title): {research_topic}

Specialist Outputs:
{orchestrator_result.final_output}

Word Count Targets:
{chr(10).join(f"- {s.section_name}: {s.word_count} words" for s in guidelines.sections)}

Format this into a complete ProjectSpecification with all sections.
"""
        
        formatter_result = await Runner.run(
            starting_agent=specification_formatter,
            input=formatter_input
        )
        
        specification = formatter_result.final_output
        
        print(f"   ✅ Specification formatted")
        print(f"   Total word count: {specification.total_word_count}")
        
        return specification
        
    except Exception as e:
        print(f"   ❌ Formatting failed: {e}")
        raise
