"""Golden wiring harness for the full pipeline (WS0 0.9).

Monkeypatches Runner.run with canned outputs keyed by agent name, runs
run_complete_specification_system with max_iterations=1, and pins:
  - phase sequencing (order of first agent invocation per phase)
  - per-phase call counts
  - the complete_results shape research_service.py consumes
  - the exact progress percentages the frontend polls

This is the contract the WS1 Lambda decomposition must preserve.
"""

from types import SimpleNamespace

import pytest

import agents as agents_sdk
from app.core.pipelines.main_pipeline import run_complete_specification_system
from app.models.config import SpecificationConfig
from app.models.locked_requirements import LockedRequirementsA, VerifiedPaper
from app.models.projects import (
    AnalyzedProjectSpecSections,
    ProjectFinderOutput,
    ProjectMethodologyDetails,
    ProjectURLEntry,
)
from app.models.resources import (
    DiscoveredDataset,
    DiscoveredMethod,
    DiscoveredPaper,
    DiscoveredResources,
    DiscoveredTool,
)
from app.models.review import OverallReview, SectionReview
from app.models.specification import ProjectSpecification
from app.models.synthesis import (
    NovelContributionClaim,
    StrategicDifferentiationPoint,
    StrategicSynthesis,
)
from tests.conftest import make_ml_spec

TOPIC = "Machine learning classification of heart disease"


def _resources() -> DiscoveredResources:
    return DiscoveredResources(
        datasets=[DiscoveredDataset(name="UCI Heart Disease", source="UCI", description="303 records")],
        methods=[DiscoveredMethod(name="Random Forest", description="Ensemble", complexity="Moderate", typical_use="Classification")],
        tools=[DiscoveredTool(name="scikit-learn", type="Library", language="Python", description="ML library")],
        papers=[
            DiscoveredPaper(title="Paper One", authors="Mohan, S.", year="2019", key_finding="88.7% accuracy", relevance="Baseline"),
            DiscoveredPaper(title="Paper Two", authors="Chen, L.", year="2021", key_finding="Survey", relevance="Context"),
        ],
        search_summary="Canned search results.",
    )


def _verified_paper() -> VerifiedPaper:
    return VerifiedPaper(
        title="Heart disease prediction using ML",
        authors="Mohan, S. and Srivastava, G.",
        year=2019,
        doi="10.1000/x1",
        source_url="https://example.org/p1",
        abstract_snippet="An ML approach...",
        key_metric="Accuracy",
        key_metric_value="88.7%",
        harvard_citation="Mohan, S. and Srivastava, G. (2019) ...",
        is_baseline_candidate=True,
    )


def _analyzed_project(i: int = 1) -> AnalyzedProjectSpecSections:
    return AnalyzedProjectSpecSections(
        project_source=f"https://example.org/thesis{i}",
        project_type="MSc thesis",
        source_stream="auto_discovered",
        project_title=f"Prior Student Project {i}",
        abstract_summary="Compared classifiers on clinical data.",
        problem_justification="Early detection matters.",
        objectives_identified=["Compare models"],
        literature_reviewed=["Paper One"],
        methodology_used=ProjectMethodologyDetails(
            algorithms_used=["Random Forest"],
            approach_type="Comparative ML",
            tools_frameworks=["Python"],
            evaluation_metrics=["F1"],
            workflow_summary="Standard pipeline.",
        ),
        datasets_used=[],
        results_achieved="82% accuracy.",
        limitations_identified=["Small sample"],
        future_work_suggested=["Larger cohort"],
        references_cited=["Mohan (2019)"],
        extraction_confidence="medium",
    )


def _synthesis() -> StrategicSynthesis:
    return StrategicSynthesis(
        positioning_statement="Positions against prior UCI work.",
        differentiation_strategy=[StrategicDifferentiationPoint(aspect="Evaluation", implementation="AUC-ROC")],
        novel_contributions=[NovelContributionClaim(claim="Explainable pipeline", justification="Prior work lacks XAI")],
        performance_targets="Above 85% accuracy",
        risk_factors=["Small dataset"],
        mitigation_strategies=["Cross-validation"],
    )


def _review() -> OverallReview:
    return OverallReview(
        section_reviews=[SectionReview(
            section_name="Methodology", marks_awarded=26, marks_possible=30,
            strengths=["Clear"], weaknesses=[], recommendations=[],
        )],
        total_marks=85,
        overall_strengths=["Coherent"],
        critical_issues=[],
        improvement_priorities=[],
        decision="APPROVED",
        supervisor_comments="Well constructed.",
    )


SECTION_WRITERS = [
    "JustificationSpecialist", "ObjectivesArchitect", "LiteratureStrategist",
    "MethodologyDesigner", "TimelineValidator", "ReferencesCompiler",
    "AbstractSpecialist",
]

HUMANIZED = " ".join(["humanized natural prose flows here"] * 60)  # 300 words


class CannedRunner:
    """Replaces agents.Runner.run — dispatches canned outputs by agent name."""

    def __init__(self):
        self.calls: list[str] = []

    async def run(self, *, starting_agent, input):  # noqa: A002 — SDK kwarg name
        name = starting_agent.name
        self.calls.append(name)
        return SimpleNamespace(final_output=self._output_for(name))

    def _output_for(self, name: str):
        if name == "WebSearcher":
            return "Canned web search snippets."
        if name == "ResourceFinder":
            return _resources()
        if name == "PaperAbstractFetcher":
            return _verified_paper()
        if name == "ProjectFinder":
            return ProjectFinderOutput(project_urls=[
                ProjectURLEntry(url="https://example.org/thesis1", confidence="high"),
                ProjectURLEntry(url="https://example.org/thesis2", confidence="medium"),
            ])
        if name == "ProjectAnalyzer":
            n = self.calls.count("ProjectAnalyzer")
            return _analyzed_project(n)
        if name == "StrategicSynthesizer":
            return _synthesis()
        if name in SECTION_WRITERS:
            return f"{name} canned section content."
        if name == "SpecificationFormatter":
            # 6 × 400 words = 2400 > 70% of the 3000 target → no expansion pass
            return make_ml_spec(words_per_section=400)
        if name == "ProfessorReviewer":
            return _review()
        if name == "CriticAgent":
            return "SECTION-BY-SECTION: STRONG methodology, WEAK abstract."
        if name == "HumanWriterAgent":
            return HUMANIZED
        raise AssertionError(f"Unexpected agent invoked: {name}")

    def first_occurrence_order(self) -> list[str]:
        seen, order = set(), []
        for name in self.calls:
            if name not in seen:
                seen.add(name)
                order.append(name)
        return order


@pytest.fixture()
def canned(monkeypatch):
    runner = CannedRunner()
    monkeypatch.setattr(agents_sdk.Runner, "run", runner.run)
    # Golden harness must stay fully offline: build_verified_citation_pool()
    # checks each DOI against CrossRef for real, and the fixture DOI below is
    # fictional. Stub it "resolved" — CrossRef integration itself is covered by
    # tests/test_integrity_fixes.py.
    import app.core.agents.definitions.phase1_paper_fetcher as fetcher_module
    monkeypatch.setattr(fetcher_module, "_crossref_doi_status", lambda doi: _resolved())
    yield runner


async def _resolved():
    return "resolved"


@pytest.mark.asyncio
async def test_full_pipeline_wiring(canned):
    config = SpecificationConfig(
        field_of_study="Computer Science",
        research_topic=TOPIC,
        academic_level="MSc",
        dataset_source="public",
        dataset_name="UCI Heart Disease Dataset",
        data_sensitivity="public",
        past_projects_mode="auto_discover",
        max_iterations=1,
        num_web_searches=2,
    )

    progress: list[int] = []

    async def progress_cb(pct: int, msg: str):
        progress.append(pct)

    results = await run_complete_specification_system(
        config=config,
        guidelines_file=None,
        past_project_files=None,
        progress_callback=progress_cb,
        dataset_file_path=None,
        agent_model_config=None,
    )

    # ── Result shape — the contract research_service.py consumes ─────────────
    assert set(results.keys()) == {
        "config", "guidelines", "topic", "track", "input_sources",
        "strategic_synthesis", "locked_requirements", "specification_results",
        "duration_seconds",
    }
    spec_results = results["specification_results"]
    assert set(spec_results.keys()) >= {
        "final_specification", "final_review", "all_iterations",
        "best_iteration_number", "iterations_completed",
        "critic_output", "critic_generated_at",
    }

    # ── Track / locked / citation pool ────────────────────────────────────────
    assert results["topic"] == TOPIC
    assert results["track"] == "A"
    assert isinstance(results["locked_requirements"], LockedRequirementsA)
    assert results["input_sources"]["citation_pool_size"] == 2
    assert results["input_sources"]["stream_stats"] == {
        "user_provided_count": 0, "auto_discovered_count": 2, "final_count": 2,
    }

    # ── Review loop ran exactly once and approved ─────────────────────────────
    assert spec_results["iterations_completed"] == 1
    assert spec_results["best_iteration_number"] == 1
    assert len(spec_results["all_iterations"]) == 1
    assert spec_results["final_review"].decision == "APPROVED"

    # ── Humanizer replaced the final specification's prose ────────────────────
    final_spec = spec_results["final_specification"]
    assert isinstance(final_spec, ProjectSpecification)
    assert final_spec.abstract.content.startswith("humanized")
    assert final_spec.project_title == make_ml_spec().project_title
    assert "STRONG" in spec_results["critic_output"]

    # ── Phase sequencing (order of first invocation) ──────────────────────────
    assert canned.first_occurrence_order() == [
        "WebSearcher", "ResourceFinder", "PaperAbstractFetcher",
        "ProjectFinder", "ProjectAnalyzer", "StrategicSynthesizer",
        *SECTION_WRITERS,
        "SpecificationFormatter", "ProfessorReviewer",
        "CriticAgent", "HumanWriterAgent",
    ]

    # ── Per-phase call counts ─────────────────────────────────────────────────
    assert canned.calls.count("WebSearcher") == 2           # num_web_searches
    assert canned.calls.count("PaperAbstractFetcher") == 2  # one per paper
    assert canned.calls.count("ProjectAnalyzer") == 2       # one per URL
    assert canned.calls.count("SpecificationFormatter") == 1  # no expansion pass
    assert canned.calls.count("ProfessorReviewer") == 1
    assert canned.calls.count("HumanWriterAgent") == 6      # one per prose section
    for writer in SECTION_WRITERS:
        assert canned.calls.count(writer) == 1

    # ── Exact progress percentages the frontend polls ─────────────────────────
    assert progress == [5, 10, 15, 22, 34, 40, 45, 50, 50, 60, 90, 92, 97]
