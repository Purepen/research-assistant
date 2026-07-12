"""Cost-control regressions (post-WS0).

Covers:
  - Bug #12: every AgentKey must have a registry entry, and the critic/humanizer
    must obey the model tier instead of silently falling back to gpt-4o.
  - No production-tier agent uses gpt-4o (replaced by gpt-4.1-mini, ~6x cheaper).
  - Targeted regeneration: iteration 2+ rewrites only reviewer-failed sections
    (plus References/Abstract, which aggregate them).
  - REQUIRE_BYOK: production deployments never fall back to the system key.
"""

from types import SimpleNamespace

import pytest

import agents as agents_sdk
from app.models.agent_config import (
    AGENT_REGISTRY_BY_KEY,
    AgentKey,
    AgentModelConfig,
    ModelTier,
)
from app.models.review import OverallReview, SectionReview
from app.core.pipelines.phase5_workflow import (
    run_specification_with_review_loop,
    select_sections_for_regeneration,
    sections_from_spec,
)
from app.core.pipelines.phase3_workflow import generate_specification_sections
from app.core.pipelines.main_pipeline import _DEFAULT_GUIDELINES
from app.core.pipelines.locked_requirements_builder import build_locked_requirements
from app.models.config import SpecificationConfig
from app.utils.openai_key import apply_openai_key
from tests.conftest import make_ml_spec
from tests.test_pipeline_wiring import (
    TOPIC,
    CannedRunner,
    _resources,
    _synthesis,
    _verified_paper,
)


# ─── Registry completeness (Bug #12 regression) ───────────────────────────────

def test_every_agent_key_has_registry_entry():
    """Bug #12: CRITIC_AGENT/HUMAN_WRITER_AGENT were referenced but unregistered."""
    missing = [k for k in AgentKey if k not in AGENT_REGISTRY_BY_KEY]
    assert missing == [], f"AgentKeys missing from AGENT_REGISTRY: {missing}"


def test_testing_tier_never_uses_gpt4o():
    config = AgentModelConfig.for_tier(ModelTier.TESTING)
    assert set(config.models.values()) == {"gpt-4o-mini"}


def test_production_tier_never_uses_gpt4o():
    """gpt-4o costs ~6x gpt-4.1-mini — it must be an explicit CUSTOM choice only."""
    config = AgentModelConfig.for_tier(ModelTier.PRODUCTION)
    offenders = {k: m for k, m in config.models.items() if m == "gpt-4o"}
    assert offenders == {}, f"Production tier still defaults to gpt-4o: {offenders}"


def test_post_agents_respect_tier():
    from app.core.agents.definitions.post_agents import build_post_agents

    config = AgentModelConfig.for_tier(ModelTier.TESTING)
    post = build_post_agents(config)
    assert post["critic"].model == "gpt-4o-mini"
    assert post["human_writer"].model == "gpt-4o-mini"


# ─── select_sections_for_regeneration ─────────────────────────────────────────

def _section_review(name: str, awarded: int, possible: int = 20, **kw) -> SectionReview:
    return SectionReview(
        section_name=name, marks_awarded=awarded, marks_possible=possible,
        strengths=kw.get("strengths", []),
        weaknesses=kw.get("weaknesses", []),
        recommendations=kw.get("recommendations", []),
    )


def _review_with(
    sections: list, decision: str = "REVISIONS REQUIRED", total_marks: int = 70
) -> OverallReview:
    return OverallReview(
        section_reviews=sections,
        total_marks=total_marks,
        overall_strengths=[],
        critical_issues=[],
        improvement_priorities=["Improve weak sections"],
        decision=decision,
        supervisor_comments="",
    )


def test_select_only_low_scoring_sections():
    review = _review_with([
        _section_review("Methodology", 8, 20,
                        weaknesses=["No baseline"], recommendations=["Add baseline"]),
        _section_review("Objectives", 18, 20),
        _section_review("Literature Review", 19, 20),
    ])
    to_regen, feedback = select_sections_for_regeneration(review)
    assert to_regen == {"methodology"}
    assert "No baseline" in feedback["methodology"]
    assert "Add baseline" in feedback["methodology"]


def test_validation_blocker_forces_section():
    review = _review_with([_section_review("Methodology", 18, 20)])
    blocker = "Work Plan has no weekly schedule"
    val = SimpleNamespace(blockers=[blocker])
    to_regen, feedback = select_sections_for_regeneration(review, val)
    assert "work_plan" in to_regen
    assert blocker in feedback["work_plan"]


def test_all_sections_passing_selects_nothing():
    review = _review_with([
        _section_review("Methodology", 18, 20),
        _section_review("Abstract", 20, 20),
    ])
    to_regen, feedback = select_sections_for_regeneration(review)
    assert to_regen == set()
    assert feedback == {}


def test_sections_from_spec_round_trip():
    spec = make_ml_spec()
    sections = sections_from_spec(spec)
    assert set(sections) == {
        "abstract", "justification", "objectives", "literature_review",
        "methodology", "work_plan", "references",
    }
    assert sections["methodology"] == spec.methodology.content
    assert spec.references[0] in sections["references"]


# ─── Targeted regeneration through phase3 ─────────────────────────────────────

def _locked():
    return build_locked_requirements(
        field_of_study="Computer Science",
        research_topic=TOPIC,
        academic_level="MSc",
        dataset_source="public",
        dataset_name="UCI Heart Disease Dataset",
        dataset_url=None,
        dataset_description=None,
        dataset_size=None,
        dataset_profile=None,
        data_sensitivity="public",
        student_success_statement=None,
        preferred_algorithms=None,
        research_nature=None,
        theoretical_framework=None,
        central_argument=None,
        primary_source_focus=None,
        citation_pool=[_verified_paper()],
        analyzed_projects=[],
        guidelines=_DEFAULT_GUIDELINES,
        synthesis=_synthesis(),
    )


class RecordingRunner(CannedRunner):
    """CannedRunner that also records each agent's prompt."""

    def __init__(self):
        super().__init__()
        self.inputs: dict = {}

    async def run(self, *, starting_agent, input):  # noqa: A002 — SDK kwarg name
        self.inputs.setdefault(starting_agent.name, []).append(input)
        return await super().run(starting_agent=starting_agent, input=input)


@pytest.mark.asyncio
async def test_targeted_regen_only_rewrites_failed_sections(monkeypatch):
    runner = RecordingRunner()
    monkeypatch.setattr(agents_sdk.Runner, "run", runner.run)

    previous = sections_from_spec(make_ml_spec())
    sections = await generate_specification_sections(
        research_topic=TOPIC,
        guidelines=_DEFAULT_GUIDELINES,
        synthesis=_synthesis(),
        locked=_locked(),
        previous_sections=previous,
        sections_to_regenerate={"methodology"},
        section_feedback={"methodology": "No baseline comparison — add one."},
    )

    # Only the failed section + the two aggregates were rewritten
    assert canned_counts(runner) == {
        "MethodologyDesigner": 1, "ReferencesCompiler": 1, "AbstractSpecialist": 1,
    }
    # The rewriter saw its previous version and the reviewer's feedback
    prompt = runner.inputs["MethodologyDesigner"][0]
    assert "REVISION CONTEXT" in prompt
    assert "No baseline comparison" in prompt
    assert previous["methodology"] in prompt
    # Passing sections came through verbatim
    assert sections["justification"] == previous["justification"]
    assert sections["objectives"] == previous["objectives"]
    assert sections["literature_review"] == previous["literature_review"]
    assert sections["work_plan"] == previous["work_plan"]
    # Rewritten sections carry new content
    assert sections["methodology"] == "MethodologyDesigner canned section content."


def canned_counts(runner: CannedRunner) -> dict:
    return {name: runner.calls.count(name) for name in set(runner.calls)}


# ─── Targeted regeneration through the full review loop ──────────────────────

class TwoIterationRunner(RecordingRunner):
    """Reviewer fails Methodology on iteration 1, approves on iteration 2."""

    def _output_for(self, name: str):
        if name == "SpecificationFormatter":
            # Clears every _DEFAULT_GUIDELINES word target (max 900 @ 85%), so
            # the only regeneration signal is the reviewer's section scores —
            # not word-count validation blockers.
            return make_ml_spec(words_per_section=1000)
        if name == "ProfessorReviewer":
            first = self.calls.count("ProfessorReviewer") == 1
            if first:
                return _review_with([
                    _section_review("Methodology", 8, 20, weaknesses=["No baseline"]),
                    _section_review("Objectives", 18, 20),
                ])
            return _review_with(
                [_section_review("Methodology", 18, 20)],
                decision="APPROVED",
                total_marks=88,
            )
        return super()._output_for(name)


@pytest.mark.asyncio
async def test_review_loop_regenerates_only_failed_sections(monkeypatch):
    runner = TwoIterationRunner()
    monkeypatch.setattr(agents_sdk.Runner, "run", runner.run)

    config = SpecificationConfig(
        field_of_study="Computer Science",
        research_topic=TOPIC,
        academic_level="MSc",
        dataset_source="public",
        dataset_name="UCI Heart Disease Dataset",
        data_sensitivity="public",
        past_projects_mode="auto_discover",
        max_iterations=3,
        num_web_searches=1,
    )

    results = await run_specification_with_review_loop(
        research_topic=TOPIC,
        strategic_synthesis=_synthesis(),
        discovered_resources=_resources(),
        guidelines=_DEFAULT_GUIDELINES,
        locked=_locked(),
        feasibility_calibration=None,
        config=config,
    )

    assert results["iterations_completed"] == 2
    assert results["final_review"].decision == "APPROVED"

    counts = canned_counts(runner)
    # Iteration 1 wrote everything; iteration 2 rewrote only Methodology + aggregates
    assert counts["MethodologyDesigner"] == 2
    assert counts["ReferencesCompiler"] == 2
    assert counts["AbstractSpecialist"] == 2
    assert counts["JustificationSpecialist"] == 1
    assert counts["ObjectivesArchitect"] == 1
    assert counts["LiteratureStrategist"] == 1
    assert counts["TimelineValidator"] == 1
    assert counts["SpecificationFormatter"] == 2
    assert counts["ProfessorReviewer"] == 2


# ─── REQUIRE_BYOK production guard ────────────────────────────────────────────

def test_require_byok_blocks_system_key_fallback(monkeypatch):
    monkeypatch.setenv("REQUIRE_BYOK", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-owner-key-should-never-be-used")
    user = SimpleNamespace(openai_api_key=None)
    with pytest.raises(RuntimeError, match="requires your own OpenAI API key"):
        apply_openai_key(user)


def test_require_byok_allows_user_key(monkeypatch):
    monkeypatch.setenv("REQUIRE_BYOK", "true")
    monkeypatch.setattr("app.core.crypto.decrypt_secret", lambda v: "sk-user-key")
    captured = {}
    monkeypatch.setattr(agents_sdk, "set_default_openai_key", lambda k: captured.update(key=k))
    user = SimpleNamespace(openai_api_key="encrypted-blob")
    apply_openai_key(user)
    assert captured["key"] == "sk-user-key"


def test_local_dev_falls_back_to_system_key(monkeypatch):
    monkeypatch.delenv("REQUIRE_BYOK", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-owner-local-key")
    captured = {}
    monkeypatch.setattr(agents_sdk, "set_default_openai_key", lambda k: captured.update(key=k))
    user = SimpleNamespace(openai_api_key=None)
    apply_openai_key(user)
    assert captured["key"] == "sk-owner-local-key"
