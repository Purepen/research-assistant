"""Tests for the zero-AI validation gate (core/validation/spec_validator.py)."""

from app.core.validation.spec_validator import format_report_for_reviewer, validate_specification
from app.models.locked_requirements import SimilarProjectEntry
from tests.conftest import make_ml_spec, small_targets


def test_good_ml_spec_passes_all():
    report = validate_specification(make_ml_spec(), small_targets(), track="A")
    assert report.blockers == []
    assert report.passes_all is True
    assert report.word_count_passes is True
    assert report.intext_citations_passes is True


def test_short_section_is_a_blocker():
    spec = make_ml_spec(words_per_section=120)
    targets = small_targets(100)
    targets["Methodology"] = 400  # 120 words < 85% of 400
    report = validate_specification(spec, targets, track="A")
    assert report.passes_all is False
    assert any("WORD COUNT FAIL — Methodology" in b for b in report.blockers)


def test_too_few_citations_is_a_blocker():
    spec = make_ml_spec(citations=5)
    report = validate_specification(spec, small_targets(), track="A")
    assert report.intext_citations_passes is False
    assert any(b.startswith("CITATION FAIL") for b in report.blockers)


def test_month_timeline_is_a_blocker():
    spec = make_ml_spec(
        work_plan_core="The project runs for 4 months in three broad stages. "
    )
    report = validate_specification(spec, small_targets(), track="A")
    assert report.track_a_checklist["no_month_timeline"] is False
    assert report.track_a_checklist["timeline_in_weeks"] is False
    assert report.passes_all is False


def test_marketing_language_flagged_as_warning():
    spec = make_ml_spec(methodology_extra="This cutting-edge groundbreaking system. ")
    report = validate_specification(spec, small_targets(), track="A")
    assert report.track_a_checklist["no_marketing_language"] is False
    assert any("MARKETING LANGUAGE" in w for w in report.warnings)


def test_econometric_paradigm_uses_its_own_checklist():
    spec = make_ml_spec(
        methodology_extra=(
            "Analysis applies OLS regression and fixed effects on panel data using Stata. "
        )
    )
    report = validate_specification(
        spec, small_targets(), track="A", paradigm="econometric_causal"
    )
    assert report.paradigm == "econometric_causal"
    assert "regression_method_named" in report.track_a_checklist
    assert "train_test_split" not in report.track_a_checklist
    assert report.track_a_checklist["regression_method_named"] is True


def test_reviewer_report_states_ground_truth_verdict():
    good = validate_specification(make_ml_spec(), small_targets(), track="A")
    text = format_report_for_reviewer(good)
    assert "VALIDATION REPORT" in text
    assert "PASSES ALL CHECKS" in text

    bad = validate_specification(make_ml_spec(citations=3), small_targets(), track="A")
    assert "HAS BLOCKERS" in format_report_for_reviewer(bad)


# ─── Topic novelty / staleness gate ────────────────────────────────────────────

def _similar_heart_disease_project(**overrides) -> SimilarProjectEntry:
    defaults = dict(
        title="Machine Learning Classification of Heart Disease",
        author_or_institution="Adebayo, T.",
        year=2021, level="MSc",
        approach_summary="Random forest classifier on UCI data.",
        limitation="No explainability analysis.",
    )
    defaults.update(overrides)
    return SimilarProjectEntry(**defaults)


def test_high_similarity_without_differentiation_is_a_warning_not_a_blocker():
    # make_ml_spec()'s title is "Machine Learning Classification of Heart Disease Risk"
    spec = make_ml_spec()
    report = validate_specification(
        spec, small_targets(), track="A",
        similar_projects=[_similar_heart_disease_project()],
    )
    assert any("POSSIBLE TOPIC STALENESS" in w for w in report.warnings)
    assert not any("STALENESS" in b for b in report.blockers)
    assert report.passes_all is True  # a warning must never flip this


def test_similarity_with_explicit_differentiation_is_not_flagged():
    spec = make_ml_spec(
        methodology_extra=(
            "This builds directly on Adebayo (2021), extending it with explainability "
            "analysis absent from that prior work. "
        )
    )
    report = validate_specification(
        spec, small_targets(), track="A",
        similar_projects=[_similar_heart_disease_project()],
    )
    assert not any("STALENESS" in w for w in report.warnings)


def test_dissimilar_prior_project_is_not_flagged():
    spec = make_ml_spec()
    unrelated = _similar_heart_disease_project(
        title="Sentiment Analysis of Twitter Posts During Elections",
        author_or_institution="Bello, K.",
    )
    report = validate_specification(spec, small_targets(), track="A", similar_projects=[unrelated])
    assert not any("STALENESS" in w for w in report.warnings)


def test_no_similar_projects_is_safe():
    report = validate_specification(make_ml_spec(), small_targets(), track="A", similar_projects=None)
    assert not any("STALENESS" in w for w in report.warnings)
    assert report.passes_all is True
