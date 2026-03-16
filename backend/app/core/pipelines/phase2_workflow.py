"""
Phase 2 Workflows

Extracted from: Notebook Cell 8
Purpose: Strategic synthesis from all 3 streams

TRACK B ADDITION:
  create_strategic_synthesis() now accepts track: str = "A".

  Track A → strategic_synthesizer_agent → StrategicSynthesis (UNCHANGED)
  Track B → theoretical_synthesizer_b_agent → TheoreticalSynthesisB

  The return type is Union[StrategicSynthesis, TheoreticalSynthesisB].
  build_locked_requirements() in locked_requirements_builder.py already
  accepts this union via AnySynthesis and handles both types correctly.

  field_of_study added as an optional parameter so the Track B prompt
  can tell the agent the exact academic discipline — education, sociology,
  law, etc. — which is essential for producing field-specific frameworks
  and debates rather than generic ones.
"""

from typing import Optional, List, Union
from agents import Runner
from app.models.guidelines import ProjectGuidelines
from app.models.resources import DiscoveredResources
from app.models.synthesis import StrategicSynthesis, TheoreticalSynthesisB
from app.models.projects import AnalyzedProjectSpecSections
from app.core.agents.definitions.phase2_agents import (
    strategic_synthesizer_agent,
    theoretical_synthesizer_b_agent,
)


async def create_strategic_synthesis(
    research_topic: str,
    discovered_resources: DiscoveredResources,
    analyzed_projects: List[AnalyzedProjectSpecSections],
    guidelines: ProjectGuidelines,
    track: str = "A",
    field_of_study: Optional[str] = None,
) -> Union[StrategicSynthesis, TheoreticalSynthesisB]:
    """
    Create strategic synthesis from all discovered resources.

    Routes to the correct agent based on track:
      Track A → StrategicSynthesis  (empirical / data / ML — original behaviour)
      Track B → TheoreticalSynthesisB (theoretical / humanities — new)

    Args:
        research_topic:      Final confirmed topic string
        discovered_resources: Output from Phase 1 resource discovery
        analyzed_projects:   Output from Phase 1 project analysis streams
        guidelines:          Parsed or default project guidelines
        track:               "A" or "B" — detected in main_pipeline.py
        field_of_study:      Student's field (e.g. "Education", "Sociology")
                             Used in Track B prompt for field-specific output.
    """

    print("\n🎯 STRATEGIC SYNTHESIS")
    print(f"   Track: {track} | Topic: {research_topic[:60]}")
    print("-" * 80)

    # ── Track A: original behaviour, completely unchanged ─────────────────────
    if track != "B":
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
""",
            )

            synthesis = result.final_output

            print(f"✅ Strategic synthesis complete")
            print(f"   Novel contributions: {len(synthesis.novel_contributions)}")
            print(f"   Risks identified: {len(synthesis.risk_factors)}")

            return synthesis

        except Exception as e:
            print(f"❌ Error creating synthesis: {e}")
            raise

    # ── Track B: humanities/theoretical synthesis ─────────────────────────────
    else:
        # Build a papers summary focused on scholarly sources, not datasets or tools
        papers_found = discovered_resources.papers
        papers_summary = ""
        if papers_found:
            papers_summary = f"PAPERS AND SCHOLARLY SOURCES FOUND ({len(papers_found)}):\n"
            for p in papers_found[:8]:
                papers_summary += f"  - {p.title[:80]} ({getattr(p, 'year', 'n.d.')})\n"
        else:
            papers_summary = "PAPERS: No papers retrieved yet — synthesise from topic knowledge.\n"

        projects_summary = ""
        if analyzed_projects:
            projects_summary = f"\nSIMILAR PROJECTS FOUND ({len(analyzed_projects)}):\n"
            for proj in analyzed_projects[:3]:
                projects_summary += f"  - {proj.project_title}\n"

        field_line = f"FIELD OF STUDY: {field_of_study}" if field_of_study else ""

        try:
            result = await Runner.run(
                starting_agent=theoretical_synthesizer_b_agent,
                input=f"""
Create a theoretical synthesis for this humanities/social science research project.

RESEARCH TOPIC: {research_topic}
{field_line}
PROJECT TYPE: {guidelines.project_type}

{papers_summary}
{projects_summary}

Produce a TheoreticalSynthesisB object with all 9 fields fully populated.
Every field must be specific to this exact topic and field — no generic placeholders.
""",
            )

            synthesis = result.final_output

            print(f"✅ Theoretical synthesis complete (Track B)")
            print(f"   Scholarly debates: {len(synthesis.scholarly_debates)}")
            print(f"   Key frameworks: {len(synthesis.key_theoretical_frameworks)}")
            print(f"   Key scholars: {len(synthesis.key_scholars)}")
            print(f"   Research gaps: {len(synthesis.research_gaps)}")

            return synthesis

        except Exception as e:
            print(f"❌ Error creating theoretical synthesis: {e}")
            raise