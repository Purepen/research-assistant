"""Tests for build_locked_requirements — the frozen ground-truth object all
downstream writer agents must obey."""

from app.core.pipelines.locked_requirements_builder import build_locked_requirements
from app.models.guidelines import ProjectGuidelines, SectionRequirement
from app.models.locked_requirements import (
    LockedRequirementsA,
    LockedRequirementsB,
    ResearchParadigm,
    VerifiedPaper,
)
from app.models.synthesis import (
    NovelContributionClaim,
    StrategicDifferentiationPoint,
    StrategicSynthesis,
    TheoreticalSynthesisB,
)


def _guidelines() -> ProjectGuidelines:
    return ProjectGuidelines(
        sections=[
            SectionRequirement(section_name="Abstract",              word_count=300),
            SectionRequirement(section_name="Justification and Aim", word_count=400),
            SectionRequirement(section_name="Objectives",            word_count=300),
            SectionRequirement(section_name="Literature Review",     word_count=800),
            SectionRequirement(section_name="Methodology",           word_count=900),
            SectionRequirement(section_name="Work Plan",             word_count=300),
        ],
        citation_style="Harvard",
        timeline_weeks=15,
        target_word_count=3000,
        project_type="mixed",
        requires_dataset=False,
        requires_methods=False,
        requires_tools=False,
        additional_requirements=[],
    )


def _citation_pool() -> list:
    return [
        VerifiedPaper(
            title="Heart disease prediction using ML",
            authors="Mohan, S. and Srivastava, G.",
            year=2019,
            doi="10.1000/x1",
            source_url="https://example.org/p1",
            abstract_snippet="An ML approach to cardiac risk...",
            key_metric="Accuracy",
            key_metric_value="88.7%",
            harvard_citation="Mohan, S. and Srivastava, G. (2019) ...",
            is_baseline_candidate=True,
        ),
        VerifiedPaper(
            title="A survey of cardiac datasets",
            authors="Chen, L.",
            year=2021,
            doi=None,
            source_url="https://example.org/p2",
            abstract_snippet="Survey of datasets...",
            harvard_citation="Chen, L. (2021) ...",
        ),
    ]


def _synthesis_a() -> StrategicSynthesis:
    return StrategicSynthesis(
        positioning_statement="Positions against prior UCI work.",
        differentiation_strategy=[
            StrategicDifferentiationPoint(aspect="Evaluation depth", implementation="Add AUC-ROC")
        ],
        novel_contributions=[
            NovelContributionClaim(claim="Explainable pipeline", justification="Prior work lacks XAI")
        ],
        performance_targets="Accuracy above 85%",
        risk_factors=["Small dataset"],
        mitigation_strategies=["Cross-validation"],
    )


def _synthesis_b() -> TheoreticalSynthesisB:
    return TheoreticalSynthesisB(
        research_positioning="Positions within postcolonial scholarship.",
        key_theoretical_frameworks=["Postcolonial theory (Bhabha, 1994)"],
        scholarly_debates=["Hybridity versus essentialism in identity formation"],
        key_scholars=["Homi Bhabha (1994) — hybridity and the third space"],
        analytical_approaches=["Close textual reading"],
        primary_source_suggestions=["Achebe's early novels (1958-1964)"],
        research_gaps=["No study reads the trilogy through classroom reception"],
        risk_factors=["Interpretive bias"],
        mitigation_strategies=["Reflective research journal"],
    )


def test_track_a_ml_build():
    locked = build_locked_requirements(
        field_of_study="Computer Science",
        research_topic="Machine learning classification of heart disease",
        academic_level="MSc",
        dataset_source="public",
        dataset_name="UCI Heart Disease Dataset",
        data_sensitivity="public",
        citation_pool=_citation_pool(),
        analyzed_projects=[],
        guidelines=_guidelines(),
        synthesis=_synthesis_a(),
    )
    assert isinstance(locked, LockedRequirementsA)
    assert locked.track == "A"
    assert locked.paradigm == ResearchParadigm.ML_CLASSIFICATION
    assert locked.timeline_weeks == 15
    assert len(locked.citation_pool) == 2
    assert "UCI" in locked.confirmed_dataset.name
    assert locked.baseline is not None  # metric-bearing baseline candidate selected
    assert locked.evaluation is not None


def test_b5_case_builds_track_a_object():
    """The B5 misroute produced a Track B object for an econometrics topic —
    this pins the corrected behaviour end-to-end at the builder level."""
    locked = build_locked_requirements(
        field_of_study="Education",
        research_topic="An Econometric Analysis of Teacher Compensation Effects",
        academic_level="MSc",
        dataset_source="public",
        data_sensitivity="public",
        research_nature="testing_causation",
        citation_pool=_citation_pool(),
        analyzed_projects=[],
        guidelines=_guidelines(),
        synthesis=_synthesis_a(),
    )
    assert isinstance(locked, LockedRequirementsA)
    assert locked.paradigm == ResearchParadigm.ECONOMETRIC_CAUSAL


def test_track_b_build():
    locked = build_locked_requirements(
        field_of_study="English Literature",
        research_topic="Postcolonial Identity in Chinua Achebe's Early Fiction",
        academic_level="MSc",
        dataset_source="public",
        data_sensitivity="public",
        theoretical_framework="Postcolonial theory (Bhabha, 1994)",
        central_argument="Achebe's early fiction stages identity as negotiated, not fixed.",
        primary_source_focus="Achebe's trilogy, 1958-1964",
        citation_pool=_citation_pool(),
        analyzed_projects=[],
        guidelines=_guidelines(),
        synthesis=_synthesis_b(),
    )
    assert isinstance(locked, LockedRequirementsB)
    assert locked.track == "B"
    assert "Postcolonial" in locked.theoretical_framework
    assert locked.central_argument
    assert locked.scholarly_debates
