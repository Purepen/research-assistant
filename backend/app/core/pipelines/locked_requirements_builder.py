"""
Locked Requirements Builder — B2

Pure Python. No AI. No guessing.
Assembles LockedRequirementsA or LockedRequirementsB from:
  - Step 1 answers (field, topic, level)
  - Step 2 answers (dataset info, guidelines)
  - Step 3 answers (student questions)
  - Citation pool (from PaperAbstractFetcher)
  - Analyzed similar projects (from Phase 1 streams)
  - Parsed guidelines (from Phase 0)

This object is the single source of truth passed to every section agent.
No agent may introduce facts not present here.
"""

from __future__ import annotations

import re
from typing import List, Optional, Union

from app.models.guidelines import ProjectGuidelines
from app.models.projects import AnalyzedProjectSpecSections
from app.models.synthesis import StrategicSynthesis
from app.core.pipelines.dataset_profiler import DatasetProfile
from app.models.locked_requirements import (
    VerifiedPaper,
    LockedDataset,
    LockedBaseline,
    SimilarProjectEntry,
    EvaluationFramework,
    EthicsStatement,
    LockedRequirementsA,
    LockedRequirementsB,
)


# ─── Track detection ──────────────────────────────────────────────────────────

# Fields that indicate Track B (theoretical/humanities)
_TRACK_B_FIELDS = {
    "english", "literature", "history", "law", "philosophy",
    "linguistics", "education", "sociology", "anthropology",
    "political science", "politics", "theology", "religious",
    "media studies", "cultural studies", "communication",
    "creative writing", "journalism", "arts", "fine art",
    "gender studies", "film", "music", "theatre", "drama",
    "international relations", "policy", "public policy",
    "criminology", "social work",
}

# Keywords in topic that strongly suggest Track A
_TRACK_A_TOPIC_SIGNALS = {
    "machine learning", "deep learning", "neural network", "data science",
    "algorithm", "classification", "regression", "clustering", "prediction",
    "dataset", "model", "ai ", "artificial intelligence", "nlp",
    "computer vision", "image recognition", "sentiment analysis",
    "blockchain", "cybersecurity", "iot", "internet of things",
    "bioinformatics", "genomics", "epidemiology", "public health data",
    "econometrics", "financial modelling", "quantitative",
    "simulation", "optimization", "engineering", "software",
    "network analysis", "signal processing",
}


def detect_track(field_of_study: str, research_topic: str) -> str:
    """
    Detect Track A or B from field and topic.
    Returns "A" for empirical/data/technical, "B" for theoretical/humanities.
    """
    field_lower = field_of_study.lower()
    topic_lower = (research_topic or "").lower()

    # Explicit Track A signals in topic override everything
    for signal in _TRACK_A_TOPIC_SIGNALS:
        if signal in topic_lower:
            return "A"

    # Check field
    for b_field in _TRACK_B_FIELDS:
        if b_field in field_lower:
            return "B"

    # Default to A — most university projects are empirical
    return "A"


# ─── Default work plan templates ─────────────────────────────────────────────

# WEEK 1 FIX: accepts algorithms list and injects it into the model training week.
def _default_work_plan_a(weeks: int, algorithms: List[str] = None) -> List[dict]:
    """Standard 15-week Track A plan. Scales for 30-week part-time."""
    algo_str = ", ".join(algorithms) if algorithms else "selected ML models"

    if weeks <= 15:
        return [
            {"weeks": "1–2",   "activity": "Literature review and baseline paper identification", "deliverable": "Annotated bibliography"},
            {"weeks": "3–4",   "activity": "Data acquisition, preprocessing, EDA, and class imbalance handling", "deliverable": "Clean dataset + EDA report"},
            {"weeks": "5–8",   "activity": f"Model training: {algo_str}. Hyperparameter tuning via grid search. Stratified cross-validation.", "deliverable": "Trained models + performance metrics"},
            {"weeks": "9–10",  "activity": "XAI integration: SHAP and LIME. Feature importance analysis", "deliverable": "Interpretation outputs"},
            {"weeks": "11–12", "activity": "Cross-dataset generalisation testing and robustness checks", "deliverable": "Generalisation metrics"},
            {"weeks": "13–15", "activity": "Write-up, supervisor review, ethics statement, final submission", "deliverable": "Final dissertation"},
        ]
    else:
        # 30-week version
        return [
            {"weeks": "1–4",   "activity": "Literature review, baseline identification, annotated bibliography", "deliverable": "Annotated bibliography"},
            {"weeks": "5–8",   "activity": "Data acquisition, preprocessing, EDA, class imbalance handling", "deliverable": "Clean dataset + EDA report"},
            {"weeks": "9–16",  "activity": f"Model training: {algo_str}. Hyperparameter tuning. Stratified cross-validation.", "deliverable": "Trained models + metrics"},
            {"weeks": "17–20", "activity": "XAI integration: SHAP and LIME", "deliverable": "Interpretation outputs"},
            {"weeks": "21–24", "activity": "Cross-dataset generalisation testing", "deliverable": "Generalisation metrics"},
            {"weeks": "25–30", "activity": "Write-up, supervisor review, final submission", "deliverable": "Final dissertation"},
        ]


def _default_work_plan_b(weeks: int) -> List[dict]:
    """Standard 15-week Track B plan."""
    if weeks <= 15:
        return [
            {"weeks": "1–2",   "activity": "Literature review and theoretical framework selection", "deliverable": "Annotated bibliography + framework justification"},
            {"weeks": "3–4",   "activity": "Close reading of primary sources; source mapping", "deliverable": "Primary source analysis notes"},
            {"weeks": "5–8",   "activity": "Thematic analysis applying chosen theoretical lens", "deliverable": "Draft thematic chapters"},
            {"weeks": "9–11",  "activity": "Engagement with scholarly debates; comparative analysis", "deliverable": "Comparative analysis draft"},
            {"weeks": "12–13", "activity": "Argument synthesis and draft full spec", "deliverable": "Complete draft"},
            {"weeks": "14–15", "activity": "Write-up, supervisor review, final submission", "deliverable": "Final dissertation"},
        ]
    else:
        return [
            {"weeks": "1–5",   "activity": "Literature review and theoretical framework selection", "deliverable": "Annotated bibliography"},
            {"weeks": "6–10",  "activity": "Close reading of primary sources", "deliverable": "Primary source analysis"},
            {"weeks": "11–18", "activity": "Thematic and comparative analysis", "deliverable": "Analysis chapters"},
            {"weeks": "19–24", "activity": "Argument synthesis", "deliverable": "Complete draft"},
            {"weeks": "25–30", "activity": "Write-up, review, final submission", "deliverable": "Final dissertation"},
        ]


# ─── Ethics statement builders ────────────────────────────────────────────────

def _build_ethics_statement(
    data_sensitivity: str,
    dataset_name: str,
    field_of_study: str,
) -> EthicsStatement:
    """Build a pre-written ethics paragraph from student's data sensitivity answer."""

    if data_sensitivity == "public":
        statement = (
            f"All datasets employed in this project are publicly available under open academic "
            f"licences, specifically the {dataset_name}. No new participant data will be collected "
            f"and no human subjects will be recruited, eliminating the requirement for institutional "
            f"ethical approval. However, it is acknowledged that publicly available clinical datasets "
            f"may exhibit demographic biases reflecting the populations from which they were drawn; "
            f"these limitations will be explicitly discussed in the findings and should be considered "
            f"when interpreting the generalisability of results. Data will be used solely for academic "
            f"research purposes and will not be redistributed or used in clinical decision-making."
        )
        return EthicsStatement(
            data_sensitivity="public",
            statement=statement,
            irb_required=False,
            population_bias_note="Acknowledge demographic limitations of the dataset.",
        )

    elif data_sensitivity == "self_collected":
        statement = (
            f"This project involves the collection of primary data as part of the research methodology. "
            f"Informed consent will be obtained from all participants prior to data collection, and "
            f"participants will be clearly informed of their right to withdraw at any time without "
            f"consequence. All collected data will be anonymised before analysis, stored securely "
            f"on password-protected systems, and deleted upon project completion in accordance with "
            f"institutional data retention policies. The research protocol will be submitted for "
            f"review to the university ethics committee prior to commencement of data collection."
        )
        return EthicsStatement(
            data_sensitivity="self_collected",
            statement=statement,
            irb_required=True,
            population_bias_note="Discuss sampling strategy and representativeness.",
        )

    else:  # sensitive
        statement = (
            f"This project involves sensitive data that may include personal or identifiable information. "
            f"All data handling will comply with the General Data Protection Regulation (GDPR) and "
            f"relevant institutional data governance policies. Ethical approval will be sought from "
            f"the university ethics committee before any data is accessed. Data minimisation principles "
            f"will be applied throughout; only data strictly necessary for the research objectives "
            f"will be retained, and all personally identifiable information will be anonymised or "
            f"pseudonymised prior to analysis."
        )
        return EthicsStatement(
            data_sensitivity="sensitive",
            statement=statement,
            irb_required=True,
            population_bias_note="Discuss ethical implications of sensitive data use.",
        )


# ─── Similar project converter ────────────────────────────────────────────────

def _convert_analyzed_projects(
    analyzed: List[AnalyzedProjectSpecSections],
) -> List[SimilarProjectEntry]:
    """Convert AnalyzedProjectSpecSections → SimilarProjectEntry list."""
    entries = []
    for proj in analyzed[:5]:  # cap at 5
        limitation = (
            proj.limitations_identified[0]
            if proj.limitations_identified
            else "Limitations not explicitly stated in the project."
        )
        approach = proj.methodology_used.approach_type if proj.methodology_used else "Not specified"
        entries.append(
            SimilarProjectEntry(
                title=proj.project_title,
                author_or_institution=proj.author_institution or "Unknown institution",
                year=proj.year,
                level=proj.project_type or "MSc",
                approach_summary=approach,
                limitation=limitation,
            )
        )
    return entries


# ─── Baseline selector ────────────────────────────────────────────────────────

def _select_baseline(citation_pool: List[VerifiedPaper]) -> Optional[LockedBaseline]:
    """
    Select the best baseline from the citation pool.
    Priority: is_baseline_candidate=True, then most recent, then first with a metric.
    Returns None if no metric-bearing papers exist — caller handles this honestly.
    """
    candidates = [p for p in citation_pool if p.is_baseline_candidate and p.key_metric_value]
    if not candidates:
        candidates = [p for p in citation_pool if p.key_metric_value]
    if not candidates:
        return None

    best = candidates[0]  # already sorted by is_baseline_candidate, then year
    metric_val = best.key_metric_value or "N/A"
    metric_name = best.key_metric or "Accuracy"

    # Parse numeric value to compute target
    try:
        num = float(re.sub(r"[^0-9.]", "", metric_val))
        if num < 1:  # it's a 0.xx score
            target_val = f"{num + 0.05:.2f}"
            target = f"minimum {target_val} {metric_name} (5-point improvement over {metric_val})"
        else:  # it's a percentage
            target_val = f"{num + 5:.1f}%"
            target = f"minimum {target_val} {metric_name} (5-point improvement over {metric_val})"
    except Exception:
        target = f"measurable improvement over the {metric_val} reported in the baseline"

    return LockedBaseline(
        paper_title=best.title,
        authors=best.authors,
        year=best.year,
        metric_name=metric_name,
        metric_value=metric_val,
        harvard_citation=best.harvard_citation,
        target_to_beat=target,
    )


# ─── Default evaluation frameworks ───────────────────────────────────────────

_DEFAULT_EVAL_BY_FIELD = {
    "medical": EvaluationFramework(
        primary_metric="AUC-ROC",
        additional_metrics=["F1 Score", "Sensitivity (Recall)", "Specificity", "Precision-Recall curve"],
        validation_strategy="Stratified 10-fold cross-validation",
        train_val_test_split="70% training, 15% validation, 15% test",
        imbalance_strategy="SMOTE (Chawla et al., 2002)",
    ),
    "nlp": EvaluationFramework(
        primary_metric="F1 Score (macro)",
        additional_metrics=["Precision", "Recall", "BLEU / ROUGE (if generative)", "Confusion Matrix"],
        validation_strategy="Stratified 5-fold cross-validation",
        train_val_test_split="70% training, 15% validation, 15% test",
        imbalance_strategy="Class weighting or oversampling",
    ),
    "general": EvaluationFramework(
        primary_metric="AUC-ROC",
        additional_metrics=["F1 Score", "Precision", "Recall", "Confusion Matrix"],
        validation_strategy="Stratified 10-fold cross-validation",
        train_val_test_split="70% training, 15% validation, 15% test",
        imbalance_strategy="SMOTE or class weighting as appropriate",
    ),
}


def _pick_evaluation_framework(field: str, topic: str) -> EvaluationFramework:
    """Select the appropriate default evaluation framework."""
    combined = (field + " " + topic).lower()
    if any(w in combined for w in ["heart", "disease", "cancer", "medical", "health", "clinical"]):
        return _DEFAULT_EVAL_BY_FIELD["medical"]
    if any(w in combined for w in ["text", "nlp", "language", "sentiment", "translation"]):
        return _DEFAULT_EVAL_BY_FIELD["nlp"]
    return _DEFAULT_EVAL_BY_FIELD["general"]


# ─── Section word target defaults ────────────────────────────────────────────

_DEFAULT_SECTION_TARGETS = {
    "Abstract":               300,
    "Justification and Aim":  400,
    "Objectives":             300,
    "Literature Review":      800,
    "Methodology":            900,
    "Work Plan":              300,
}


def _build_section_targets(guidelines: ProjectGuidelines) -> dict:
    targets = {}
    for s in guidelines.sections:
        targets[s.section_name] = s.word_count
    if not targets:
        return _DEFAULT_SECTION_TARGETS.copy()
    return targets


# ─── Main builder ─────────────────────────────────────────────────────────────

def build_locked_requirements(
    # Step 1 data
    field_of_study: str,
    research_topic: str,
    academic_level: str,

    # Step 2 data
    dataset_source: str,            # "uploaded" | "public" | "scout" | "self_collected"
    data_sensitivity: str,          # "public" | "self_collected" | "sensitive"

    # Derived data
    citation_pool: List[VerifiedPaper],
    analyzed_projects: List[AnalyzedProjectSpecSections],
    guidelines: ProjectGuidelines,

    # Optional Step 2 data
    dataset_name: Optional[str] = None,
    dataset_url: Optional[str] = None,
    dataset_description: Optional[str] = None,
    dataset_size: Optional[str] = None,

    # Optional Step 3 data
    student_success_statement: Optional[str] = None,   # Track A Q2
    preferred_algorithms: Optional[str] = None,         # Track A Q3 — WEEK 2
    theoretical_framework: Optional[str] = None,        # Track B Q1
    central_argument: Optional[str] = None,             # Track B Q2
    primary_source_focus: Optional[str] = None,         # Track B Q3

    # Optional derived
    synthesis: Optional[StrategicSynthesis] = None,
    dataset_profile: Optional["DatasetProfile"] = None,  # from dataset_profiler.py

) -> Union[LockedRequirementsA, LockedRequirementsB]:
    """
    Assemble LockedRequirements from all collected inputs.
    Returns LockedRequirementsA for Track A, LockedRequirementsB for Track B.
    """

    track = detect_track(field_of_study, research_topic)
    timeline_weeks = guidelines.timeline_weeks or 15
    section_targets = _build_section_targets(guidelines)
    similar_projects = _convert_analyzed_projects(analyzed_projects)
    citation_style = guidelines.citation_style or "Harvard"

    print(f"\n🔒 LOCKED REQUIREMENTS BUILDER")
    print(f"   Track: {track} | Timeline: {timeline_weeks} weeks")
    print(f"   Citation pool: {len(citation_pool)} verified papers")
    print(f"   Similar projects: {len(similar_projects)}")

    # ── Track A ───────────────────────────────────────────────────────────────
    if track == "A":

        # Dataset — enriched with real profile if available
        _has_profile = dataset_profile is not None and not dataset_profile.is_fallback
        _size_str = (
            f"{dataset_profile.row_count:,} rows × {dataset_profile.column_count} columns"
            if _has_profile else dataset_size
        )
        _desc_str = dataset_description or f"Dataset for {research_topic} research"

        # Build missing value summary from profile
        _missing_summary = None
        _quality_notes = None
        if _has_profile:
            high_missing = [
                f"{c.name}: {c.missing_pct}%"
                for c in dataset_profile.columns
                if c.missing_pct > 5
            ]
            _missing_summary = "; ".join(high_missing) if high_missing else "No significant missing values"
            _quality_notes = (
                f"{dataset_profile.duplicate_row_count} duplicate rows detected"
                if dataset_profile.duplicate_row_count > 0
                else "No duplicate rows detected"
            )
            print(f"   ✅ Dataset profile injected: {dataset_profile.row_count:,} rows, "
                  f"{dataset_profile.column_count} columns")

        confirmed_dataset = LockedDataset(
            name=dataset_name or "To be confirmed during data acquisition phase",
            source=dataset_source,
            access_url=dataset_url,
            description=_desc_str,
            size=_size_str,
            is_public=(data_sensitivity == "public" or dataset_source == "public"),
            harvard_citation=_build_dataset_citation(
                dataset_name or "Dataset", dataset_url, dataset_source
            ),
            # Real profile fields
            row_count=dataset_profile.row_count if _has_profile else None,
            column_count=dataset_profile.column_count if _has_profile else None,
            column_names=[c.name for c in dataset_profile.columns] if _has_profile else [],
            column_dtypes={c.name: c.dtype for c in dataset_profile.columns} if _has_profile else {},
            missing_value_summary=_missing_summary,
            duplicate_rows=dataset_profile.duplicate_row_count if _has_profile else None,
            data_quality_notes=_quality_notes,
            full_profile_text=dataset_profile.summary_for_agents if _has_profile else None,
            profiled=_has_profile,
        )

        # WEEK 1 FIX: baseline is Optional — None is honest, fake is not.
        # If citation pool has no metric-bearing papers, baseline stays None.
        # The methodology agent prompt handles None with an honest instruction.
        baseline = _select_baseline(citation_pool)
        if not baseline:
            print("   ⚠️  No baseline found in citation pool — baseline set to None.")
            print("       Methodology section will instruct student to confirm one with supervisor.")
        else:
            print(f"   ✅ Baseline: {baseline.authors} ({baseline.year}) — {baseline.metric_value}")

        # Evaluation framework
        evaluation = _pick_evaluation_framework(field_of_study, research_topic)

        # Ethics
        ethics = _build_ethics_statement(
            data_sensitivity=data_sensitivity,
            dataset_name=confirmed_dataset.name,
            field_of_study=field_of_study,
        )

        # WEEK 2: _pick_algorithms now has 3-tier priority — student → synthesis → keywords.
        algorithms, justifications = _pick_algorithms(
            field_of_study, research_topic, synthesis,
            preferred_algorithms=preferred_algorithms,
        )

        # XAI techniques
        xai = _pick_xai(field_of_study, research_topic, synthesis)

        # WEEK 1 FIX: pass algorithms into work plan so week 5-8 names the real models.
        work_plan = _default_work_plan_a(timeline_weeks, algorithms=algorithms)

        locked = LockedRequirementsA(
            research_topic=research_topic,
            field_of_study=field_of_study,
            academic_level=academic_level,
            timeline_weeks=timeline_weeks,
            citation_pool=citation_pool,
            confirmed_dataset=confirmed_dataset,
            baseline=baseline,                  # None is valid — honest over fake
            similar_projects=similar_projects,  # Empty list is valid — do not fabricate
            evaluation=evaluation,
            ethics=ethics,
            xai_techniques=xai,
            algorithms=algorithms,
            algorithm_justifications=justifications,
            work_plan_weeks=work_plan,
            student_success_statement=student_success_statement,
            target_word_count=guidelines.target_word_count or 3000,
            citation_style=citation_style,
            section_word_targets=section_targets,
        )

        print(f"   ✅ LockedRequirementsA assembled")
        return locked

    # ── Track B ───────────────────────────────────────────────────────────────
    else:
        scholarly_debates = _extract_debates(synthesis, research_topic)
        positionality = _build_positionality(field_of_study, research_topic)
        work_plan = _default_work_plan_b(timeline_weeks)

        locked = LockedRequirementsB(
            research_topic=research_topic,
            field_of_study=field_of_study,
            academic_level=academic_level,
            timeline_weeks=timeline_weeks,
            citation_pool=citation_pool,
            theoretical_framework=theoretical_framework or _suggest_framework(field_of_study, research_topic),
            framework_justification=(
                f"This framework is appropriate for {research_topic} because it provides "
                f"analytical tools to examine the underlying structures, power relations, "
                f"and cultural contexts that shape the subject matter."
            ),
            central_argument=central_argument or "To be developed through literature engagement",
            primary_source_focus=primary_source_focus,
            scholarly_debates=scholarly_debates,
            similar_projects=similar_projects,  # Empty list is valid — do not fabricate
            positionality_statement=positionality,
            work_plan_weeks=work_plan,
            target_word_count=guidelines.target_word_count or 3000,
            citation_style=citation_style,
            section_word_targets=section_targets,
        )

        print(f"   ✅ LockedRequirementsB assembled")
        return locked


# ─── Helper functions ─────────────────────────────────────────────────────────

def _build_dataset_citation(name: str, url: Optional[str], source: str) -> str:
    from datetime import datetime
    today = datetime.now().strftime("%d %B %Y").lstrip("0")
    url_str = url or f"https://www.{source.lower()}.com"
    return f"{name} [Dataset]. Available at: {url_str} (Accessed: {today})."


# WEEK 2: 3-tier priority — student intent → synthesis literature → keyword fallback.
def _pick_algorithms(
    field: str,
    topic: str,
    synthesis: Optional[StrategicSynthesis],
    preferred_algorithms: Optional[str] = None,
) -> tuple:
    """
    Return (algorithms list, justifications dict).

    Priority:
      1. Student's own stated preferences (preferred_algorithms from Step 3 Q3)
         — uses what the student wrote; always includes an interpretable baseline
      2. Methods mentioned in synthesis.novel_contributions (from actual papers read)
         — grounded in the literature the agent actually retrieved
      3. Keyword matching against field/topic (last resort)
         — pure heuristic, used only when no better signal exists
    """

    # ── Priority 1: Student's own stated preferences ──────────────────────────
    if preferred_algorithms and preferred_algorithms.strip():
        raw = re.split(r"[,;/]", preferred_algorithms)
        student_algs = [a.strip() for a in raw if a.strip() and len(a.strip()) > 2]

        if len(student_algs) >= 2:
            # Check whether student already included an interpretable baseline
            baseline_terms = ["logistic", "baseline", "naive bayes", "linear regression", "knn"]
            has_baseline = any(
                any(bt in a.lower() for bt in baseline_terms)
                for a in student_algs
            )
            if not has_baseline:
                student_algs.append("Logistic Regression (baseline)")

            just = {}
            for a in student_algs:
                a_lower = a.lower()
                if any(bt in a_lower for bt in ["logistic", "baseline", "linear regression"]):
                    just[a] = "Interpretable baseline for comparison against more complex models"
                elif "xgboost" in a_lower or "gradient boost" in a_lower:
                    just[a] = f"High-performance ensemble method; student-identified as relevant to {topic}"
                elif "lstm" in a_lower or "rnn" in a_lower:
                    just[a] = f"Recurrent architecture suited to sequential patterns; student-identified"
                elif "bert" in a_lower or "transformer" in a_lower:
                    just[a] = f"State-of-the-art contextual representation; student-identified"
                elif "cnn" in a_lower or "resnet" in a_lower:
                    just[a] = f"Convolutional architecture for feature extraction; student-identified"
                else:
                    just[a] = f"Student-identified as relevant to {topic}"

            print(f"   ✅ Algorithms: from student preferences ({len(student_algs)} methods)")
            return student_algs, just

    # ── Priority 2: Methods from actual literature (synthesis) ────────────────
    KNOWN_METHODS = [
        "random forest", "xgboost", "lstm", "bert", "svm", "logistic regression",
        "cnn", "transformer", "gradient boosting", "neural network", "decision tree",
        "naive bayes", "k-nearest neighbour", "support vector machine", "resnet", "vgg",
        "lightgbm", "catboost", "adaboost",
    ]

    if synthesis and synthesis.novel_contributions:
        mentioned_methods: List[str] = []
        seen_lower: set = set()
        for contrib in synthesis.novel_contributions:
            claim = contrib.claim.lower()
            for method in KNOWN_METHODS:
                if method in claim and method not in seen_lower:
                    seen_lower.add(method)
                    # Title-case nicely
                    display = method.upper() if method in ("svm", "lstm", "bert", "cnn", "vgg") \
                        else method.title()
                    mentioned_methods.append(display)

        if len(mentioned_methods) >= 2:
            # Ensure a baseline exists
            has_baseline = any(
                "logistic" in m.lower() or "baseline" in m.lower()
                for m in mentioned_methods
            )
            if not has_baseline:
                mentioned_methods.append("Logistic Regression (baseline)")

            just = {}
            for m in mentioned_methods:
                if "logistic" in m.lower() or "baseline" in m.lower():
                    just[m] = "Interpretable baseline for comparison against more complex models"
                else:
                    just[m] = f"Identified in verified literature as relevant to {topic}"

            print(f"   ✅ Algorithms: from synthesis literature ({len(mentioned_methods)} methods)")
            return mentioned_methods, just

    # ── Priority 3: Keyword matching (last resort) ────────────────────────────
    print(f"   ℹ️  Algorithms: keyword fallback (no student preferences or synthesis signal)")
    combined = (field + " " + topic).lower()

    if any(w in combined for w in ["image", "vision", "cnn", "convolution"]):
        algs = ["CNN", "ResNet", "VGG", "Logistic Regression (baseline)"]
        just = {
            "CNN": "Standard architecture for image classification tasks",
            "ResNet": "Residual connections address vanishing gradient for deeper models",
            "VGG": "Well-established benchmark for comparison",
            "Logistic Regression (baseline)": "Interpretable baseline for binary classification",
        }
    elif any(w in combined for w in ["text", "nlp", "sentiment", "language"]):
        algs = ["BERT", "Logistic Regression (baseline)", "SVM", "Random Forest"]
        just = {
            "BERT": "State-of-the-art contextual embeddings for text classification",
            "Logistic Regression (baseline)": "Interpretable baseline for comparison",
            "SVM": "Strong performer on high-dimensional text features",
            "Random Forest": "Robust ensemble method for tabular/TF-IDF features",
        }
    else:
        # Default classification suite (covers heart disease, fraud, etc.)
        algs = ["Logistic Regression", "Support Vector Machine", "Random Forest", "Artificial Neural Network"]
        just = {
            "Logistic Regression": "Interpretable baseline appropriate for binary classification; low risk of overfitting on small datasets",
            "Support Vector Machine": "Established performance in binary medical classification tasks with high-dimensional feature spaces",
            "Random Forest": "Ensemble method providing robustness to overfitting; handles non-linear interactions without feature scaling",
            "Artificial Neural Network": "Included to benchmark deep learning performance against simpler models and test whether added complexity improves results",
        }

    return algs, just


def _pick_xai(field: str, topic: str, synthesis: Optional[StrategicSynthesis]) -> Optional[List[str]]:
    """Return XAI techniques if appropriate for the project type."""
    combined = (field + " " + topic).lower()
    interpretability_signals = [
        "interpret", "explain", "xai", "shap", "lime", "transparent",
        "clinical", "medical", "health", "disease", "diagnosis"
    ]
    if any(s in combined for s in interpretability_signals):
        return [
            "SHAP (SHapley Additive exPlanations) (Lundberg and Lee, 2017)",
            "LIME (Local Interpretable Model-agnostic Explanations) (Ribeiro et al., 2016)",
        ]
    return None


def _suggest_framework(field: str, topic: str) -> str:
    """Suggest a theoretical framework for Track B if student didn't choose one."""
    combined = (field + " " + topic).lower()
    if any(w in combined for w in ["postcolonial", "colonial", "africa", "diaspora"]):
        return "Postcolonial theory (Bhabha, 1994; Said, 1978)"
    if any(w in combined for w in ["gender", "feminist", "women"]):
        return "Feminist theory (Butler, 1990)"
    if any(w in combined for w in ["discourse", "power", "foucault"]):
        return "Critical discourse analysis (Fairclough, 1992)"
    if any(w in combined for w in ["law", "legal", "rights", "justice"]):
        return "Critical legal theory"
    if any(w in combined for w in ["media", "representation", "culture"]):
        return "Cultural studies / representation theory (Hall, 1997)"
    return "Critical theory — to be confirmed with supervisor"


def _extract_debates(synthesis: Optional[StrategicSynthesis], topic: str) -> List[str]:
    """Extract scholarly debates from synthesis or generate defaults."""
    if synthesis and synthesis.differentiation_strategy:
        return [d.aspect for d in synthesis.differentiation_strategy[:3]]
    return [
        f"The methodological debate within {topic} scholarship",
        f"Contested theoretical frameworks applied to this subject area",
        f"Emerging critical perspectives challenging traditional approaches",
    ]


def _build_positionality(field: str, topic: str) -> str:
    return (
        f"As a researcher approaching {topic}, I acknowledge that my academic "
        f"background in {field} shapes the analytical lens through which this subject "
        f"is examined. This positionality will be reflected upon throughout the project "
        f"to ensure rigorous, reflexive scholarship."
    )


def _fallback_similar_projects(topic: str) -> List[SimilarProjectEntry]:
    """
    Do NOT fabricate similar projects.
    Return an empty list — the justification agent is instructed to handle this honestly.
    Dead code: no longer called from build_locked_requirements. Kept for import safety.
    """
    return []  # Empty. Do not fabricate.