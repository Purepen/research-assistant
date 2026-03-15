"""
Configuration Model — UPDATED v4 (Paradigm Edition)

New field in v4:
  - research_nature (Track A Q4) — student's plain-English study type answer
    that drives paradigm detection in detect_paradigm()

All v3 fields are unchanged.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal


class SpecificationConfig(BaseModel):

    # ── Step 1: Basic info ────────────────────────────────────────────────────
    field_of_study: str = Field(
        description="Student's field of study (e.g. 'Computer Science - Machine Learning')"
    )
    research_topic: Optional[str] = Field(
        default=None,
        description="Research topic — if None, system will suggest topics"
    )
    academic_level: Literal["BSc", "MSc", "PhD"] = Field(
        default="MSc",
        description="Academic level — affects expectations and complexity"
    )
    effort_level: Literal["low", "medium", "high"] = Field(
        default="medium",
        description="low: safe/fast | medium: standard depth | high: ambitious"
    )

    # ── Step 2: Dataset info ──────────────────────────────────────────────────
    dataset_source: Literal["uploaded", "public", "scout", "self_collected"] = Field(
        default="public",
        description=(
            "uploaded: student uploaded a CSV  |  "
            "public: student named a public dataset  |  "
            "scout: system should find one  |  "
            "self_collected: student will collect their own data"
        )
    )
    dataset_name: Optional[str] = Field(
        default=None,
        description="Name of the dataset if known (e.g. 'UCI Heart Disease Dataset')"
    )
    dataset_url: Optional[str] = Field(
        default=None,
        description="URL or access path of the dataset"
    )
    dataset_description: Optional[str] = Field(
        default=None,
        description="Brief description of the dataset"
    )
    dataset_size: Optional[str] = Field(
        default=None,
        description="Dataset size e.g. '303 records', '50,000 samples'"
    )

    # ── Step 3: Student answers ────────────────────────────────────────────────

    # Track A — Q1 (data sensitivity, unchanged)
    data_sensitivity: Literal["public", "self_collected", "sensitive"] = Field(
        default="public",
        description="public: open-licence data | self_collected: primary data | sensitive: restricted data"
    )

    # Track A — Q2 (success statement, unchanged)
    student_success_statement: Optional[str] = Field(
        default=None,
        description="Track A Q2: 'What would success look like for your model?'"
    )

    # Track A — Q3 (algorithm preferences, unchanged from v3)
    preferred_algorithms: Optional[str] = Field(
        default=None,
        description=(
            "Track A Q3: algorithms or methods the student is considering, "
            "comma-separated free text (e.g. 'Random Forest, XGBoost, LSTM'). "
            "If provided, takes priority over synthesis and keyword matching in _pick_algorithms(). "
            "For non-ML students: 'OLS, PSM' or 'Likert, regression' also valid here."
        )
    )

    # Track A — Q4 (NEW — paradigm hint from plain-English study-type question)
    research_nature: Optional[str] = Field(
        default=None,
        description=(
            "Track A Q4: the student's plain-English answer to 'What kind of study is this?' "
            "Frontend maps their option to an internal value: "
            "  'building_model'     → ML_CLASSIFICATION "
            "  'testing_causation'  → ECONOMETRIC_CAUSAL "
            "  'running_survey'     → SURVEY_QUANTITATIVE "
            "  'building_system'    → SYSTEMS_ENGINEERING "
            "  'financial_analysis' → FINANCE_QUANT "
            "  'not_sure'           → auto-detect from field+topic (fallback) "
            "None means the student left it blank — same as 'not_sure'."
        )
    )

    # Track B (all unchanged)
    theoretical_framework: Optional[str] = Field(
        default=None,
        description="Track B: chosen theoretical/analytical framework"
    )
    central_argument: Optional[str] = Field(
        default=None,
        description="Track B: student's one-sentence main argument"
    )
    primary_source_focus: Optional[str] = Field(
        default=None,
        description="Track B: specific texts, authors, time period, or place"
    )

    # ── Auto-discovery configuration (unchanged) ──────────────────────────────
    past_projects_mode: Literal["user_provided", "auto_discover", "hybrid"] = Field(
        default="hybrid"
    )
    num_auto_projects_target: int = Field(default=3, ge=1, le=5)
    min_auto_projects_required: int = Field(default=1, ge=0, le=5)
    max_auto_projects_accepted: int = Field(default=3, ge=1, le=10)
    deduplicate_auto_vs_user: bool = Field(default=True)

    # ── System parameters (unchanged) ──────────────────────────────────────────
    max_iterations: int = Field(default=3, ge=1, le=5)
    max_chars_per_project: int = Field(default=20000, ge=5000, le=50000)
    num_web_searches: int = Field(default=5, ge=1, le=10)
    notification_email: Optional[str] = Field(default=None)

    def __str__(self):
        return (
            f"Configuration:\n"
            f"  Field: {self.field_of_study}\n"
            f"  Topic: {self.research_topic or 'To be suggested'}\n"
            f"  Level: {self.academic_level}\n"
            f"  Effort: {self.effort_level}\n"
            f"  Dataset: {self.dataset_name or self.dataset_source}\n"
            f"  Data sensitivity: {self.data_sensitivity}\n"
            f"  Research nature (Q4): {self.research_nature or 'Not specified — auto-detected'}\n"
            f"  Preferred algorithms: {self.preferred_algorithms or 'Not specified — auto-selected'}\n"
            f"  Past projects mode: {self.past_projects_mode}\n"
            f"  Web searches: {self.num_web_searches}\n"
            f"  Max iterations: {self.max_iterations}"
        )


DEFAULT_CONFIG = SpecificationConfig(
    field_of_study="Computer Science - Machine Learning",
    academic_level="MSc",
    effort_level="medium",
    dataset_source="public",
    dataset_name="UCI Heart Disease Dataset",
    data_sensitivity="public",
    past_projects_mode="hybrid",
    num_auto_projects_target=3,
    min_auto_projects_required=1,
    max_auto_projects_accepted=3,
    deduplicate_auto_vs_user=True,
    num_web_searches=5,
    max_iterations=3,
)