"""
Phase 2 Workflows

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

Model Tier Addition (Apr 2026):
  create_strategic_synthesis() now accepts an optional agent_model_config
  parameter. When present, tier-aware synthesizer agents are built via
  build_phase2_agents() and used instead of the module-level singletons.
  When None, all existing behaviour is unchanged.
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
    agent_model_config=None,   # NEW — Optional[AgentModelConfig]
) -> Union[StrategicSynthesis, TheoreticalSynthesisB]:
    """
    Create strategic synthesis from all discovered resources.

    Routes to the correct agent based on track:
      Track A → StrategicSynthesis  (empirical / data / ML — original behaviour)
      Track B → TheoreticalSynthesisB (theoretical / humanities — new)

    agent_model_config: when present, tier-aware synthesizer agents are built via
      build_phase2_agents(). When None, module-level singletons are used.

    Args:
        research_topic:      Final confirmed topic string
        discovered_resources: Output from Phase 1 resource discovery
        analyzed_projects:   Output from Phase 1 project analysis streams
        guidelines:          Parsed or default project guidelines
        track:               "A" or "B" — detected in main_pipeline.py
        field_of_study:      Student's field (e.g. "Education", "Sociology")
                             Used in Track B prompt for field-specific output.
        agent_model_config:  Optional AgentModelConfig for model tier routing.
    """

    print("\n🎯 STRATEGIC SYNTHESIS")
    print(f"   Track: {track}")
    print("-" * 80)

    # ── Resolve which agents to use ───────────────────────────────────────────
    _strategic_agent     = strategic_synthesizer_agent
    _theoretical_agent   = theoretical_synthesizer_b_agent

    if agent_model_config is not None:
        # No try/except here: a user paying for a model tier must get it or see
        # the failure — silently downgrading to defaults was Bug #2.
        from app.core.agents.definitions.phase2_agents import build_phase2_agents
        from app.models.agent_config import AgentKey

        _agents = build_phase2_agents(agent_model_config)
        _strategic_agent   = _agents["strategic_synthesizer"]
        _theoretical_agent = _agents["theoretical_synthesizer"]
        print(f"   🤖 Phase 2 model: {agent_model_config.get(AgentKey.STRATEGIC_SYNTHESIZER)}")

    # ── Build context — UNCHANGED ─────────────────────────────────────────────
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

    # ── Track A: Empirical / Data / ML ────────────────────────────────────────
    if track != "B":
        try:
            result = await Runner.run(
                starting_agent=_strategic_agent,
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

            print("✅ Strategic synthesis complete (Track A)")
            print(f"   Novel contributions: {len(synthesis.novel_contributions)}")
            print(f"   Risks identified: {len(synthesis.risk_factors)}")

            return synthesis

        except Exception as e:
            print(f"❌ Error creating synthesis: {e}")
            raise

    # ── Track B: Theoretical / Humanities ─────────────────────────────────────
    field_context = f"Field of Study: {field_of_study}" if field_of_study else ""

    try:
        result = await Runner.run(
            starting_agent=_theoretical_agent,
            input=f"""
Create a theoretical/humanities synthesis for:

RESEARCH TOPIC: {research_topic}
{field_context}
PROJECT TYPE: {guidelines.project_type}

{resources_summary}
{projects_summary}

Create a TheoreticalSynthesisB object with:
- scholarly_debates: major ongoing debates in this field relevant to the topic
- key_theoretical_frameworks: frameworks the student should engage with
- key_scholars: most cited and influential scholars in this area
- analytical_approaches: appropriate methodological approaches for this study
- primary_source_suggestions: recommended primary sources or archives
- research_gaps: specific gaps in the existing scholarly literature

Be field-specific — use discipline-appropriate terminology, not generic social science language.
""",
        )

        synthesis = result.final_output

        print("✅ Theoretical synthesis complete (Track B)")
        print(f"   Scholarly debates: {len(synthesis.scholarly_debates)}")
        print(f"   Key frameworks: {len(synthesis.key_theoretical_frameworks)}")

        return synthesis

    except Exception as e:
        print(f"❌ Error creating theoretical synthesis: {e}")
        raise