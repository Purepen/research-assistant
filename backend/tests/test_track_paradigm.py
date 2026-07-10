"""Track and paradigm detection tests, including the B5 regression case.

B5 incident: an Education-field econometrics topic was misrouted to Track B
(theoretical) and scored 31/100. The fix made topic-title quantitative signals
override field-name signals in detect_track().
"""

import pytest

from app.core.pipelines.locked_requirements_builder import detect_paradigm, detect_track
from app.models.locked_requirements import ResearchParadigm


# ── detect_track ──────────────────────────────────────────────────────────────

def test_b5_regression_econometric_topic_beats_track_b_field():
    """THE B5 case: 'econometric' in the title wins over the Education field."""
    track = detect_track(
        "Education",
        "An Econometric Analysis of Teacher Compensation Effects on Student Outcomes",
    )
    assert track == "A"


@pytest.mark.parametrize("topic_signal", [
    "The Impact of School Feeding Programmes on Attendance",
    "Determinants of Household Savings in Rural Communities",
    "A Quantitative Study of Reading Intervention Outcomes",
    "Panel Data Evidence on Teacher Retention",
])
def test_quantitative_topic_signals_force_track_a(topic_signal):
    assert detect_track("Sociology", topic_signal) == "A"


def test_humanities_field_with_theoretical_topic_is_track_b():
    track = detect_track(
        "English Literature",
        "Postcolonial Identity in Chinua Achebe's Early Fiction",
    )
    assert track == "B"


def test_unknown_field_defaults_to_track_a():
    assert detect_track("Astrobiology", "Signatures in exoplanet atmospheres") == "A"


def test_cs_ml_topic_is_track_a():
    assert detect_track(
        "Computer Science", "Machine learning classification of heart disease"
    ) == "A"


# ── detect_paradigm ───────────────────────────────────────────────────────────

@pytest.mark.parametrize("nature,expected", [
    ("building_model",      ResearchParadigm.ML_CLASSIFICATION),
    ("testing_causation",   ResearchParadigm.ECONOMETRIC_CAUSAL),
    ("running_survey",      ResearchParadigm.SURVEY_QUANTITATIVE),
    ("building_system",     ResearchParadigm.SYSTEMS_ENGINEERING),
    ("financial_analysis",  ResearchParadigm.FINANCE_QUANT),
])
def test_research_nature_answer_drives_paradigm(nature, expected):
    assert detect_paradigm("Any Field", "any topic", research_nature=nature) == expected


@pytest.mark.parametrize("algorithms,expected", [
    ("OLS, PSM, fixed effects",   ResearchParadigm.ECONOMETRIC_CAUSAL),
    ("GARCH, monte carlo",        ResearchParadigm.FINANCE_QUANT),
    ("Likert scales with SPSS",   ResearchParadigm.SURVEY_QUANTITATIVE),
])
def test_preferred_algorithms_drive_paradigm(algorithms, expected):
    assert detect_paradigm("Any Field", "any topic", preferred_algorithms=algorithms) == expected


def test_default_paradigm_is_ml_classification():
    assert detect_paradigm(
        "Computer Science", "heart disease prediction"
    ) == ResearchParadigm.ML_CLASSIFICATION
