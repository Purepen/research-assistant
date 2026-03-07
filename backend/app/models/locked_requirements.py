"""
Locked Requirements Models

Purpose: Single source of truth assembled BEFORE any generation agent runs.
         Every section agent reads from this object exclusively.
         No agent may introduce facts, citations, or claims not present here.

Two shapes:
  - LockedRequirementsA  →  empirical / data / technical projects (Track A)
  - LockedRequirementsB  →  theoretical / humanities / essay projects (Track B)

Track is determined at Step 1 submission by field_of_study + research_topic.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional


# ─── Verified Paper ───────────────────────────────────────────────────────────

class VerifiedPaper(BaseModel):
    """
    A real, DOI-linked paper with confirmed performance figures.
    Only papers that pass the PaperAbstractFetcher enter the citation pool.
    """
    title: str
    authors: str                      # e.g. "Mohan, S., Thirumalai, C. and Srivastava, G."
    year: int
    doi: Optional[str] = None         # None only if genuinely DOI-less (conference abs)
    source_url: str                   # URL that was fetched
    abstract_snippet: str             # First 500 chars of abstract
    key_metric: Optional[str] = None  # e.g. "AUC-ROC", "F1", "Accuracy"
    key_metric_value: Optional[str] = None  # e.g. "0.91", "87.4%"
    harvard_citation: str             # Pre-formatted Cite Them Right Harvard string
    is_baseline_candidate: bool = False


# ─── Confirmed Dataset ────────────────────────────────────────────────────────

class LockedDataset(BaseModel):
    """Dataset confirmed by the student or scouted and accepted."""
    name: str
    source: str             # "UCI", "Kaggle", "user_uploaded", "self_collected"
    access_url: Optional[str] = None
    description: str
    size: Optional[str] = None
    is_public: bool = True
    harvard_citation: str   # Pre-formatted dataset citation


# ─── Named Baseline ───────────────────────────────────────────────────────────

class LockedBaseline(BaseModel):
    """
    The single named benchmark this project is measured against.
    Every agent that mentions performance targets reads this — no exceptions.
    """
    paper_title: str
    authors: str
    year: int
    metric_name: str         # e.g. "Accuracy", "AUC-ROC"
    metric_value: str        # e.g. "87.4%", "0.91"
    harvard_citation: str
    target_to_beat: str      # e.g. "minimum 92% accuracy or 5-point AUC-ROC improvement"


# ─── Similar Project Entry ────────────────────────────────────────────────────

class SimilarProjectEntry(BaseModel):
    """
    A real past project used for explicit differentiation in Justification.
    JustificationSpecialist must name and critique at least 2 of these.
    """
    title: str
    author_or_institution: str
    year: Optional[int] = None
    level: str               # "BSc", "MSc", "PhD"
    approach_summary: str    # What they did
    limitation: str          # What they did NOT do — the gap this project fills


# ─── Evaluation Framework ─────────────────────────────────────────────────────

class EvaluationFramework(BaseModel):
    """Explicitly defined metrics for Track A projects."""
    primary_metric: str                    # e.g. "AUC-ROC"
    additional_metrics: List[str]          # e.g. ["F1 Score", "Sensitivity", "Specificity"]
    validation_strategy: str               # e.g. "Stratified 10-fold cross-validation"
    train_val_test_split: str              # e.g. "70% train, 15% validation, 15% test"
    imbalance_strategy: Optional[str] = None  # e.g. "SMOTE (Chawla et al., 2002)"


# ─── Ethics Statement ─────────────────────────────────────────────────────────

class EthicsStatement(BaseModel):
    """Pre-written ethics content locked in before methodology agent runs."""
    data_sensitivity: str    # "public", "self_collected", "sensitive"
    statement: str           # Full paragraph ready to drop into methodology
    irb_required: bool = False
    population_bias_note: Optional[str] = None


# ─── Track A: Empirical / Data / Technical ────────────────────────────────────

class LockedRequirementsA(BaseModel):
    """
    Locked context for Track A (CS, Engineering, Data Science, Health Informatics, etc.)
    
    All 8 mandatory methodology checklist items are represented here.
    The MethodologyDesigner instruction enforces all 8 must appear.
    """
    track: str = "A"

    # Core identification
    research_topic: str
    field_of_study: str
    academic_level: str          # BSc / MSc / PhD
    timeline_weeks: int          # 15 (full-time) or 30 (part-time)

    # Citation pool — ONLY these can be cited. No fabrication allowed.
    citation_pool: List[VerifiedPaper] = Field(
        description="Verified, DOI-linked papers. Agents may ONLY cite from this pool."
    )

    # Dataset (checklist item 1)
    confirmed_dataset: LockedDataset

    # Baseline (checklist item 2)
    baseline: LockedBaseline

    # Similar projects for differentiation (used by JustificationSpecialist)
    similar_projects: List[SimilarProjectEntry] = Field(
        min_length=1,
        description="At least 1 real similar project for explicit differentiation."
    )

    # Evaluation framework (checklist items 3+4)
    evaluation: EvaluationFramework

    # Ethics (checklist item 5)
    ethics: EthicsStatement

    # XAI / interpretability tools if claimed (checklist item 6)
    xai_techniques: Optional[List[str]] = None  # e.g. ["SHAP (Lundberg & Lee, 2017)", "LIME"]

    # Algorithms to use (checklist item 7)
    algorithms: List[str] = Field(
        description="Named algorithms with brief justifications."
    )
    algorithm_justifications: dict = Field(
        default_factory=dict,
        description="Mapping: algorithm_name → why_chosen"
    )

    # Work plan structure (checklist item 8)
    work_plan_weeks: List[dict] = Field(
        description="List of {weeks: str, activity: str, deliverable: str}"
    )

    # Student's stated success definition (from Step 3 Q)
    student_success_statement: Optional[str] = None

    # Guidelines-derived targets
    target_word_count: int = 3000
    citation_style: str = "Harvard"
    section_word_targets: dict = Field(
        default_factory=dict,
        description="section_name → minimum word count"
    )


# ─── Track B: Theoretical / Humanities / Essay ────────────────────────────────

class LockedRequirementsB(BaseModel):
    """
    Locked context for Track B (English, Law, History, Policy, Philosophy, etc.)
    
    No datasets. No algorithms. No metrics.
    Framework + argument + sources + positionality.
    """
    track: str = "B"

    # Core identification
    research_topic: str
    field_of_study: str
    academic_level: str
    timeline_weeks: int

    # Citation pool
    citation_pool: List[VerifiedPaper] = Field(
        description="Verified scholarly sources. Agents may ONLY cite from this pool."
    )

    # Theoretical framework chosen by student
    theoretical_framework: str       # e.g. "Postcolonial theory (Bhabha, 1994)"
    framework_justification: str     # Why this lens fits the topic

    # Student's stated argument
    central_argument: str            # One sentence, student's own words from Step 3

    # Primary source focus
    primary_source_focus: Optional[str] = None  # e.g. "Chinua Achebe's trilogy, 1958-1964"

    # Key scholarly debates in the field
    scholarly_debates: List[str] = Field(
        description="Active debates this project engages with"
    )

    # Similar projects for differentiation
    similar_projects: List[SimilarProjectEntry] = Field(
        min_length=1
    )

    # Positionality / ethics for humanities
    positionality_statement: Optional[str] = None

    # Work plan for theoretical project (reading-heavy)
    work_plan_weeks: List[dict] = Field(
        description="List of {weeks: str, activity: str, deliverable: str}"
    )

    # Guidelines-derived
    target_word_count: int = 3000
    citation_style: str = "Harvard"
    section_word_targets: dict = Field(default_factory=dict)
