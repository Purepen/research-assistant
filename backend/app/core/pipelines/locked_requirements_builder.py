"""
Locked Requirements Builder — B5 (Signal Fix Edition)

Changes from B4:
  _TRACK_A_TOPIC_SIGNALS expanded with 14 missing quantitative/causal phrases.

  ROOT CAUSE OF THE 31/100 FAILURE:
  Student entered field="Education", topic="...An Econometric Analysis".
  detect_track() scans _TRACK_A_TOPIC_SIGNALS first. The set contained
  "econometrics" but NOT "econometric" (one character difference). Signal missed.
  Field scan then found "education" in _TRACK_B_FIELDS and returned Track B.
  The student received: thematic analysis, positionality statement, IRB clearance.
  They titled their project "An Econometric Analysis." Examiner gave 31/100.

  NEW SIGNALS ADDED (all are quantitative/causal method phrases
  that appear in topic titles and should always trigger Track A):
    "econometric"           — the critical miss ("econometric" ≠ "econometrics")
    "regression analysis"   — explicit statistical method in title
    "statistical analysis"  — explicit quantitative method
    "quantitative analysis" — explicit quantitative framing
    "quantitative study"    — explicit quantitative framing
    "empirical analysis"    — empirical study signal
    "empirical study"       — empirical study signal
    "causal analysis"       — causal inference signal
    "causal inference"      — causal inference signal
    "panel data"            — econometric data structure
    "impact of"             — causal research question framing
    "effect of"             — causal research question framing
    "determinants of"       — econometric determinants study
    "an analysis of"        — quantitative analysis signal

  All other logic — paradigm detection, method pickers, Track B assembly,
  TheoreticalSynthesisB wiring — UNCHANGED from B4.
"""

from __future__ import annotations

import re
from typing import List, Optional, Union

from app.models.guidelines import ProjectGuidelines
from app.models.projects import AnalyzedProjectSpecSections
from app.models.synthesis import StrategicSynthesis, TheoreticalSynthesisB
from app.core.pipelines.dataset_profiler import DatasetProfile
from app.models.locked_requirements import (
    ResearchParadigm,
    VerifiedPaper,
    LockedDataset,
    LockedBaseline,
    SimilarProjectEntry,
    EvaluationFramework,
    EthicsStatement,
    LockedRequirementsA,
    LockedRequirementsB,
)

AnySynthesis = Optional[Union[StrategicSynthesis, TheoreticalSynthesisB]]


# ─── Track detection ──────────────────────────────────────────────────────────

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

# SIGNAL FIX: 14 new signals added. Topic-level quantitative/causal phrases
# now win over field-level Track B classification.
# Rule: if a student titles their project with a quantitative method phrase,
# that phrase is more reliable evidence of Track A than their department name.
_TRACK_A_TOPIC_SIGNALS = {
    # ── Existing signals (unchanged) ─────────────────────────────────────────
    "machine learning", "deep learning", "neural network", "data science",
    "algorithm", "classification", "regression", "clustering", "prediction",
    "dataset", "model", "ai ", "artificial intelligence", "nlp",
    "computer vision", "image recognition", "sentiment analysis",
    "blockchain", "cybersecurity", "iot", "internet of things",
    "bioinformatics", "genomics", "epidemiology", "public health data",
    "econometrics", "financial modelling", "quantitative",
    "simulation", "optimization", "engineering", "software",
    "network analysis", "signal processing",
    # ── New signals (B5 fix) ──────────────────────────────────────────────────
    "econometric",           # THE critical miss — "econometric" ≠ "econometrics"
    "regression analysis",   # explicit statistical method in topic title
    "statistical analysis",  # explicit quantitative framing
    "quantitative analysis", # explicit quantitative framing
    "quantitative study",    # explicit quantitative framing
    "empirical analysis",    # empirical study signal
    "empirical study",       # empirical study signal
    "causal analysis",       # causal inference signal
    "causal inference",      # causal inference signal
    "panel data",            # econometric data structure
    "impact of",             # causal research question — "The Impact of X on Y"
    "effect of",             # causal research question — "The Effect of X on Y"
    "determinants of",       # econometric determinants study
    "an analysis of",        # quantitative analysis signal
}


def detect_track(field_of_study: str, research_topic: str) -> str:
    """
    Detect Track A (empirical) or Track B (theoretical).

    Priority:
      1. Topic signals — if the topic title contains a quantitative/causal method
         phrase, return "A" immediately regardless of field. A student who writes
         "An Econometric Analysis" in their title is doing quantitative work even
         if they're in an Education or Sociology department.
      2. Field signals — if no topic signal matches, check the field name against
         _TRACK_B_FIELDS. Education, Sociology, Law etc. default to Track B.
      3. Default → "A" (safe fallback for ambiguous cases).
    """
    topic_lower = (research_topic or "").lower()
    for signal in _TRACK_A_TOPIC_SIGNALS:
        if signal in topic_lower:
            return "A"
    field_lower = field_of_study.lower()
    for b_field in _TRACK_B_FIELDS:
        if b_field in field_lower:
            return "B"
    return "A"


# ─── Paradigm detection (unchanged from B4) ──────────────────────────────────

_ECONOMETRIC_FIELDS = {
    "economics", "finance", "accounting", "business administration",
    "development studies", "health economics", "public administration",
    "international business", "banking", "investment", "commerce",
    "actuarial", "economic", "financial economics", "business",
    "agribusiness", "agricultural economics",
}

_ECONOMETRIC_TOPIC_SIGNALS = [
    "impact of", "effect of", "influence of", "role of",
    "determinants of", "relationship between",
    "impact investing", "foreign direct investment", "fdi",
    "job creation", "employment", "gdp", "economic growth",
    "wages", "productivity", "poverty", "inequality",
    "fiscal policy", "monetary policy", "firm performance",
    "stock return", "market efficiency", "financial performance",
    "microfinance", "remittance", "trade", "inflation",
]

_FINANCE_QUANT_SIGNALS = [
    "volatility", "portfolio", "value at risk", "garch", "monte carlo",
    "asset pricing", "risk model", "option pricing", "hedge",
    "stock price", "bond yield", "credit risk", "var ",
]

_SURVEY_TOPIC_SIGNALS = [
    "perception", "attitude", "adoption", "satisfaction", "intention",
    "behaviour", "behavior", "awareness", "motivation", "willingness",
    "acceptance", "engagement", "experience", "opinion",
]

_SURVEY_FIELDS = {
    "management", "education", "psychology", "marketing", "hr",
    "human resource", "organisational", "organizational", "nursing",
    "public health", "pharmacy", "social work",
}

_SYSTEMS_SIGNALS = [
    "system design", "web application", "web app", "mobile app",
    "api ", "microservice", "architecture design", "software architecture",
    "deploy", "implementation", "platform", "database design",
    "cloud ", "iot system", "embedded system",
]


def detect_paradigm(
    field_of_study: str,
    research_topic: str,
    research_nature: Optional[str] = None,
    preferred_algorithms: Optional[str] = None,
) -> ResearchParadigm:
    """Determine the research paradigm for a Track A project. Unchanged from B4."""

    if research_nature:
        rn = research_nature.lower().strip()
        if rn in ("econometric_causal", "testing_causation"):
            return ResearchParadigm.ECONOMETRIC_CAUSAL
        if rn in ("survey_quantitative", "running_survey"):
            return ResearchParadigm.SURVEY_QUANTITATIVE
        if rn in ("systems_engineering", "building_system"):
            return ResearchParadigm.SYSTEMS_ENGINEERING
        if rn in ("finance_quant", "financial_analysis"):
            return ResearchParadigm.FINANCE_QUANT
        if rn in ("ml_classification", "building_model"):
            return ResearchParadigm.ML_CLASSIFICATION

    if preferred_algorithms:
        alg_lower = preferred_algorithms.lower()
        econ_terms = ["ols", "psm", "propensity", "diff-in-diff", "did ",
                      "fixed effect", "random effect", "instrumental variable",
                      "hausman", "regression analysis", "panel data"]
        if any(t in alg_lower for t in econ_terms):
            print("   📐 Paradigm detected from preferred_algorithms: ECONOMETRIC_CAUSAL")
            return ResearchParadigm.ECONOMETRIC_CAUSAL

        finance_terms = ["garch", "var ", "monte carlo", "volatility model",
                         "portfolio optim", "arima", "event study"]
        if any(t in alg_lower for t in finance_terms):
            print("   📐 Paradigm detected from preferred_algorithms: FINANCE_QUANT")
            return ResearchParadigm.FINANCE_QUANT

        survey_terms = ["likert", "cronbach", "spss", "sem ", "structural equation",
                        "questionnaire", "survey analysis", "factor analysis"]
        if any(t in alg_lower for t in survey_terms):
            print("   📐 Paradigm detected from preferred_algorithms: SURVEY_QUANTITATIVE")
            return ResearchParadigm.SURVEY_QUANTITATIVE

    field_l = field_of_study.lower()
    topic_l = (research_topic or "").lower()

    if any(s in topic_l for s in _SYSTEMS_SIGNALS):
        print("   📐 Paradigm detected from topic keywords: SYSTEMS_ENGINEERING")
        return ResearchParadigm.SYSTEMS_ENGINEERING

    if any(s in topic_l for s in _FINANCE_QUANT_SIGNALS):
        print("   📐 Paradigm detected from topic keywords: FINANCE_QUANT")
        return ResearchParadigm.FINANCE_QUANT

    if any(f in field_l for f in _ECONOMETRIC_FIELDS):
        if any(s in topic_l for s in _ECONOMETRIC_TOPIC_SIGNALS):
            print(f"   📐 Paradigm detected: ECONOMETRIC_CAUSAL (field={field_of_study})")
            return ResearchParadigm.ECONOMETRIC_CAUSAL

    if any(f in field_l for f in _SURVEY_FIELDS):
        if any(s in topic_l for s in _SURVEY_TOPIC_SIGNALS):
            print(f"   📐 Paradigm detected: SURVEY_QUANTITATIVE (field={field_of_study})")
            return ResearchParadigm.SURVEY_QUANTITATIVE

    print("   📐 Paradigm: ML_CLASSIFICATION (default — no other signal found)")
    return ResearchParadigm.ML_CLASSIFICATION


# ─── All method pickers, helpers, and builder — UNCHANGED FROM B4 ─────────────
# Everything below this line is identical to B4. Only _TRACK_A_TOPIC_SIGNALS
# and detect_track() were modified above.

def _pick_econometric_methods(field: str, topic: str, synthesis: AnySynthesis) -> tuple:
    topic_l = topic.lower()
    if any(w in topic_l for w in ["panel", "cross-country", "longitudinal", "countries", "firms over time"]):
        methods = [
            "OLS Regression (pooled baseline)",
            "Fixed Effects Model",
            "Random Effects Model",
            "Hausman Test for model selection",
        ]
        just = {
            "OLS Regression (pooled baseline)":
                "Provides the baseline estimate before controlling for unobserved unit heterogeneity; "
                "a standard starting point in panel econometrics",
            "Fixed Effects Model":
                "Controls for all time-invariant unobserved differences between units (firms, countries), "
                "isolating the within-unit effect of the treatment variable (Wooldridge, 2010)",
            "Random Effects Model":
                "More efficient than FE when unobserved effects are uncorrelated with regressors; "
                "suitability is formally tested via Hausman (1978)",
            "Hausman Test for model selection":
                "Standard econometric test to determine whether Fixed or Random Effects is the "
                "appropriate specification; result reported as part of model selection (Hausman, 1978)",
        }
    elif any(w in topic_l for w in ["impact", "effect", "causal", "invest", "policy", "treatment", "intervention"]):
        methods = [
            "OLS Regression (baseline estimate)",
            "Propensity Score Matching (PSM)",
            "Difference-in-Differences (if pre/post data available)",
        ]
        just = {
            "OLS Regression (baseline estimate)":
                "Provides the initial association estimate controlling for observed confounders; "
                "forms the naive comparison before addressing selection bias",
            "Propensity Score Matching (PSM)":
                "Addresses selection bias by matching treated and control units on the probability of "
                "treatment assignment, creating a quasi-experimental comparison "
                "(Rosenbaum and Rubin, 1983). Standard for impact evaluation without random assignment.",
            "Difference-in-Differences (if pre/post data available)":
                "Estimates causal effect by comparing outcome changes over time between treatment and "
                "control groups, removing time-invariant confounding under the parallel trends assumption "
                "(Angrist and Pischke, 2009)",
        }
    else:
        methods = [
            "Descriptive Statistics and Correlation Analysis",
            "OLS Multiple Linear Regression",
            "Heteroskedasticity-Robust Standard Errors",
            "Multicollinearity Diagnostics (VIF)",
        ]
        just = {
            "Descriptive Statistics and Correlation Analysis":
                "Provides preliminary assessment of variable distributions and bivariate "
                "relationships before regression modelling; standard practice in quantitative research",
            "OLS Multiple Linear Regression":
                "Estimates the linear relationship between the outcome variable and a set of "
                "independent variables while controlling for confounders simultaneously (OLS assumptions: "
                "Wooldridge, 2010)",
            "Heteroskedasticity-Robust Standard Errors":
                "White (1980) robust standard errors are applied to guard against heteroskedasticity "
                "in the error term, which would otherwise inflate t-statistics",
            "Multicollinearity Diagnostics (VIF)":
                "Variance Inflation Factors are computed for all regressors; VIF > 10 indicates "
                "problematic collinearity requiring variable exclusion or transformation",
        }
    return methods, just


def _pick_survey_methods(field: str, topic: str) -> tuple:
    methods = [
        "Descriptive Statistics (mean, SD, frequency distribution)",
        "Reliability Testing — Cronbach's Alpha",
        "Correlation Analysis (Pearson / Spearman)",
        "Multiple Linear Regression or Ordinal Regression",
    ]
    just = {
        "Descriptive Statistics (mean, SD, frequency distribution)":
            "Characterises the sample and describes the distribution of Likert responses "
            "before inferential analysis; required for any survey-based study",
        "Reliability Testing — Cronbach's Alpha":
            "Assesses internal consistency of the measurement instrument. "
            "Nunnally (1978) recommends α > 0.7 as the threshold for acceptable reliability; "
            "constructs below this threshold are revised or excluded",
        "Correlation Analysis (Pearson / Spearman)":
            "Examines bivariate relationships between constructs before regression; "
            "Spearman is used where Likert data violates normality assumptions",
        "Multiple Linear Regression or Ordinal Regression":
            "Tests the predictive relationship between independent variables (constructs) "
            "and the outcome; ordinal regression is used when the dependent variable is a "
            "Likert-scale construct rather than a continuous measure (Field, 2018)",
    }
    return methods, just


def _pick_systems_methods(field: str, topic: str) -> tuple:
    topic_l = topic.lower()
    has_performance = any(w in topic_l for w in ["performance", "scalability", "load", "throughput"])
    has_usability   = any(w in topic_l for w in ["usability", "user experience", "ux", "interface"])

    methods = ["System Design and Architecture Specification"]
    just    = {
        "System Design and Architecture Specification":
            "Formal specification of system components, interfaces, and data flows using "
            "UML or equivalent notation; forms the primary artefact of a systems-design project",
    }
    if has_performance:
        methods.append("Performance Benchmarking (response time, throughput, error rate)")
        just["Performance Benchmarking (response time, throughput, error rate)"] = (
            "Quantitative evaluation of system performance under controlled load using "
            "Apache JMeter or Locust. Metrics include mean response time (target: < 200ms "
            "at 95th percentile), throughput (requests/sec), and error rate (< 1%)"
        )
    if has_usability:
        methods.append("Usability Testing — System Usability Scale (SUS)")
        just["Usability Testing — System Usability Scale (SUS)"] = (
            "The System Usability Scale (Brooke, 1996) is a validated 10-item Likert "
            "questionnaire administered to representative users. A SUS score ≥ 68 indicates "
            "above-average usability (Bangor et al., 2008)"
        )
    methods.append("Functional Testing and Verification Against Requirements")
    just["Functional Testing and Verification Against Requirements"] = (
        "Each functional requirement is tested with defined test cases; "
        "pass/fail results are recorded in a traceability matrix linking requirements "
        "to test outcomes"
    )
    return methods, just


def _pick_finance_methods(field: str, topic: str) -> tuple:
    topic_l = topic.lower()
    methods, just = [], {}
    if any(w in topic_l for w in ["volatility", "garch", "heterosked"]):
        methods.append("GARCH(1,1) Volatility Model")
        just["GARCH(1,1) Volatility Model"] = (
            "Captures time-varying volatility clustering in financial return series; "
            "GARCH(1,1) is the standard specification shown to adequately fit most financial "
            "time series (Bollerslev, 1986)"
        )
    if any(w in topic_l for w in ["var", "risk", "value at risk"]):
        methods.append("Value at Risk (VaR) — Historical Simulation and Parametric")
        just["Value at Risk (VaR) — Historical Simulation and Parametric"] = (
            "Both historical simulation and parametric (normal) VaR are computed at the "
            "99th percentile for comparison; Kupiec (1995) back-testing is applied to "
            "validate coverage"
        )
    if any(w in topic_l for w in ["portfolio", "optimis", "allocation"]):
        methods.append("Mean-Variance Portfolio Optimisation (Markowitz, 1952)")
        just["Mean-Variance Portfolio Optimisation (Markowitz, 1952)"] = (
            "Constructs the efficient frontier by minimising portfolio variance for a given "
            "expected return; the Sharpe ratio is used as the primary performance measure"
        )
    if any(w in topic_l for w in ["monte carlo", "simulation"]):
        methods.append("Monte Carlo Simulation")
        just["Monte Carlo Simulation"] = (
            "Generates 10,000+ simulated return paths from fitted distributional parameters "
            "to estimate tail risk and expected shortfall under uncertainty"
        )
    if not methods:
        methods = [
            "Descriptive Statistics of Return Series",
            "OLS Regression on Financial Data",
            "Stationarity Testing (ADF Test)",
        ]
        just = {
            "Descriptive Statistics of Return Series":
                "Summarises distributional properties of financial returns including mean, "
                "standard deviation, skewness, and kurtosis; non-normality is tested via "
                "Jarque-Bera test",
            "OLS Regression on Financial Data":
                "Estimates the linear relationship between variables of interest after "
                "confirming stationarity; HAC-robust standard errors applied",
            "Stationarity Testing (ADF Test)":
                "Augmented Dickey-Fuller test is applied to all financial time series to "
                "confirm stationarity before regression; non-stationary series are "
                "differenced appropriately (Dickey and Fuller, 1979)",
        }
    return methods, just


def _pick_methods(
    field: str,
    topic: str,
    synthesis: AnySynthesis,
    paradigm: ResearchParadigm,
    preferred_algorithms: Optional[str] = None,
) -> tuple:
    if paradigm == ResearchParadigm.ECONOMETRIC_CAUSAL:
        if preferred_algorithms and preferred_algorithms.strip():
            raw = re.split(r"[,;/]", preferred_algorithms)
            student_methods = [m.strip() for m in raw if m.strip() and len(m.strip()) > 2]
            if len(student_methods) >= 1:
                just = {m: f"Student-identified method for this econometric study; appropriate for {topic}"
                        for m in student_methods}
                return student_methods, just
        return _pick_econometric_methods(field, topic, synthesis)
    elif paradigm == ResearchParadigm.SURVEY_QUANTITATIVE:
        return _pick_survey_methods(field, topic)
    elif paradigm == ResearchParadigm.SYSTEMS_ENGINEERING:
        return _pick_systems_methods(field, topic)
    elif paradigm == ResearchParadigm.FINANCE_QUANT:
        return _pick_finance_methods(field, topic)
    else:
        return _pick_algorithms(field, topic, synthesis, preferred_algorithms)


def _pick_evaluation_framework_by_paradigm(field: str, topic: str, paradigm: ResearchParadigm) -> EvaluationFramework:
    if paradigm == ResearchParadigm.ECONOMETRIC_CAUSAL:
        return EvaluationFramework(
            primary_metric="Coefficient significance (p < 0.05) and model R²",
            additional_metrics=[
                "95% confidence intervals on key coefficients",
                "Heteroskedasticity-robust standard errors (White, 1980)",
                "Variance Inflation Factor (VIF < 10 for all regressors)",
                "Breusch-Pagan test for heteroskedasticity",
                "Hausman test statistic (if panel data used)",
            ],
            validation_strategy=(
                "Robustness checks with alternative variable specifications, "
                "alternative estimation periods, and sub-group analysis"
            ),
            train_val_test_split=(
                "Not applicable — full dataset used for estimation; "
                "train/test split is a machine learning concept not used in econometric inference"
            ),
            imbalance_strategy=None,
        )
    elif paradigm == ResearchParadigm.SURVEY_QUANTITATIVE:
        return EvaluationFramework(
            primary_metric="Regression coefficient significance and R² (explained variance)",
            additional_metrics=[
                "Cronbach's Alpha for reliability (target: α > 0.7)",
                "Correlation coefficients (Pearson / Spearman)",
                "Standardised regression coefficients (β)",
                "Factor loadings (if confirmatory factor analysis used)",
            ],
            validation_strategy=(
                "Pilot study with ≥30 respondents to test instrument reliability "
                "before main data collection; split-half reliability cross-check"
            ),
            train_val_test_split=(
                "Not applicable — survey data is not split into training and test sets; "
                "inferential statistics are applied to the full sample"
            ),
            imbalance_strategy=None,
        )
    elif paradigm == ResearchParadigm.SYSTEMS_ENGINEERING:
        return EvaluationFramework(
            primary_metric="Functional requirement pass rate (target: 100% of critical requirements)",
            additional_metrics=[
                "Mean response time under load (target: < 200ms at 95th percentile)",
                "System throughput (requests/second under peak load)",
                "Error rate under stress testing (target: < 1%)",
                "System Usability Scale (SUS) score ≥ 68 (if usability testing applied)",
            ],
            validation_strategy=(
                "Requirement-driven testing using a traceability matrix; "
                "performance tests run at 50%, 100%, and 150% of target load"
            ),
            train_val_test_split=(
                "Not applicable — system evaluation uses functional and performance "
                "testing, not machine learning train/test methodology"
            ),
            imbalance_strategy=None,
        )
    elif paradigm == ResearchParadigm.FINANCE_QUANT:
        return EvaluationFramework(
            primary_metric="Statistical significance of model parameters and goodness-of-fit",
            additional_metrics=[
                "AIC/BIC for model selection between competing specifications",
                "Kupiec (1995) back-test for VaR coverage (if applicable)",
                "Sharpe ratio and maximum drawdown (if portfolio analysis)",
                "Ljung-Box test for residual autocorrelation",
            ],
            validation_strategy=(
                "Rolling window out-of-sample validation; model estimated on in-sample "
                "period and evaluated on held-out recent data"
            ),
            train_val_test_split=(
                "In-sample / out-of-sample split using chronological boundary "
                "(typically 80% in-sample / 20% out-of-sample by time)"
            ),
            imbalance_strategy=None,
        )
    else:
        return _pick_evaluation_framework(field, topic)


def _pick_algorithms(
    field: str,
    topic: str,
    synthesis: AnySynthesis,
    preferred_algorithms: Optional[str] = None,
) -> tuple:
    if preferred_algorithms and preferred_algorithms.strip():
        raw = re.split(r"[,;/]", preferred_algorithms)
        student_algs = [a.strip() for a in raw if a.strip() and len(a.strip()) > 2]
        if len(student_algs) >= 2:
            baseline_terms = ["logistic", "baseline", "naive bayes", "linear regression", "knn"]
            has_baseline = any(any(bt in a.lower() for bt in baseline_terms) for a in student_algs)
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
                    just[a] = "Recurrent architecture suited to sequential patterns; student-identified"
                elif "bert" in a_lower or "transformer" in a_lower:
                    just[a] = "State-of-the-art contextual representation; student-identified"
                elif "cnn" in a_lower or "resnet" in a_lower:
                    just[a] = "Convolutional architecture for spatial/image features; student-identified"
                elif "random forest" in a_lower:
                    just[a] = "Robust ensemble method; resistant to overfitting on moderately-sized datasets"
                elif "svm" in a_lower or "support vector" in a_lower:
                    just[a] = "Effective for high-dimensional classification; student-identified"
                else:
                    just[a] = f"Student-identified method — appropriate for {topic}"
            print(f"   🎯 Algorithms: Priority 1 (student preference) — {student_algs}")
            return student_algs, just

    if synthesis and isinstance(synthesis, StrategicSynthesis) and synthesis.novel_contributions:
        combined = " ".join(c.claim for c in synthesis.novel_contributions).lower()
        found_algs, found_just = [], {}
        ml_method_map = {
            "random forest":      ("Random Forest", "Identified from literature review as a high-performing ensemble method for this problem domain"),
            "xgboost":            ("XGBoost",        "Gradient boosted trees found in reviewed papers to achieve strong benchmark performance"),
            "support vector":     ("Support Vector Machine", "SVM identified in synthesis as effective for this classification task"),
            "neural network":     ("Artificial Neural Network", "Deep learning approach surfaced from literature synthesis"),
            "lstm":               ("LSTM",            "Long Short-Term Memory network identified in literature for sequential modelling"),
            "bert":               ("BERT",            "Transformer-based NLP model found in synthesis for text classification"),
            "cnn":                ("CNN",             "Convolutional Neural Network identified in literature for spatial feature extraction"),
            "logistic regression":("Logistic Regression", "Interpretable baseline found consistently across reviewed studies"),
            "k-nearest":          ("K-Nearest Neighbours", "Instance-based learner identified in synthesis for comparison"),
            "naive bayes":        ("Naive Bayes",    "Probabilistic baseline identified from reviewed papers"),
        }
        for keyword, (alg_name, justification) in ml_method_map.items():
            if keyword in combined:
                found_algs.append(alg_name)
                found_just[alg_name] = justification
        if len(found_algs) >= 2:
            baseline_terms = ["logistic", "baseline", "naive bayes", "k-nearest"]
            has_baseline = any(any(bt in a.lower() for bt in baseline_terms) for a in found_algs)
            if not has_baseline:
                found_algs.append("Logistic Regression (baseline)")
                found_just["Logistic Regression (baseline)"] = "Interpretable baseline added to anchor comparison"
            print(f"   🎯 Algorithms: Priority 2 (synthesis) — {found_algs}")
            return found_algs, found_just

    combined = (field + " " + (topic or "")).lower()
    if any(w in combined for w in ["image", "photo", "visual", "object detect", "face"]):
        algs = ["CNN (ResNet-50)", "EfficientNet", "Vision Transformer (ViT)", "Logistic Regression (baseline)"]
        just = {
            "CNN (ResNet-50)": "Deep convolutional architecture standard for image classification tasks",
            "EfficientNet": "Compound-scaled CNN achieving strong accuracy/efficiency trade-off",
            "Vision Transformer (ViT)": "Attention-based architecture demonstrating competitive image recognition performance",
            "Logistic Regression (baseline)": "Simple interpretable baseline for comparison",
        }
    elif any(w in combined for w in ["text", "nlp", "language", "sentiment", "translation", "document"]):
        algs = ["BERT (fine-tuned)", "TF-IDF + Logistic Regression (baseline)", "LSTM", "XGBoost"]
        just = {
            "BERT (fine-tuned)": "Pre-trained transformer achieving state-of-the-art results on text classification benchmarks",
            "TF-IDF + Logistic Regression (baseline)": "Strong traditional NLP baseline providing interpretable feature weights",
            "LSTM": "Recurrent architecture capturing sequential dependencies in text",
            "XGBoost": "Gradient boosted trees applied to TF-IDF features for robust non-neural comparison",
        }
    elif any(w in combined for w in ["time series", "forecast", "predict", "temporal", "sequence"]):
        algs = ["LSTM", "ARIMA (statistical baseline)", "XGBoost", "Prophet"]
        just = {
            "LSTM": "Long Short-Term Memory network suited to long-range sequential dependencies",
            "ARIMA (statistical baseline)": "Classical time-series baseline for comparison against deep learning approaches",
            "XGBoost": "Gradient boosting applied to lagged feature representations; strong tabular baseline",
            "Prophet": "Facebook's decomposable time-series model handling seasonality and trend changes",
        }
    else:
        algs = ["Logistic Regression", "Support Vector Machine", "Random Forest", "Artificial Neural Network"]
        just = {
            "Logistic Regression": "Interpretable probabilistic baseline providing odds-ratio insights",
            "Support Vector Machine": "Effective for binary classification with strong theoretical guarantees (Cortes and Vapnik, 1995)",
            "Random Forest": "Ensemble method robust to overfitting; handles mixed feature types well (Breiman, 2001)",
            "Artificial Neural Network": "Feedforward network providing a deep learning benchmark",
        }
    print(f"   🎯 Algorithms: Priority 3 (keyword matching) — {algs}")
    return algs, just


def _pick_xai(field: str, topic: str, synthesis: AnySynthesis) -> Optional[List[str]]:
    combined = (field + " " + (topic or "")).lower()
    xai_relevant = any(w in combined for w in [
        "health", "medical", "clinical", "disease", "diagnos",
        "fraud", "credit", "loan", "financial risk",
        "predict", "classification", "interpretab", "explain",
    ])
    if not xai_relevant:
        return None
    return ["SHAP (Lundberg and Lee, 2017)", "LIME (Ribeiro et al., 2016)"]


def _pick_evaluation_framework(field: str, topic: str) -> EvaluationFramework:
    _DEFAULT_EVAL_BY_FIELD = {
        "medical": EvaluationFramework(
            primary_metric="AUC-ROC",
            additional_metrics=["F1 Score", "Sensitivity (Recall)", "Specificity", "Precision-Recall Curve", "Confusion Matrix"],
            validation_strategy="Stratified 10-fold cross-validation",
            train_val_test_split="70% train, 15% validation, 15% test (stratified)",
            imbalance_strategy="SMOTE (Chawla et al., 2002)",
        ),
        "nlp": EvaluationFramework(
            primary_metric="F1 Score (macro-averaged)",
            additional_metrics=["Precision", "Recall", "AUC-ROC (binary)", "Confusion Matrix"],
            validation_strategy="Stratified 5-fold cross-validation",
            train_val_test_split="80% train, 10% validation, 10% test (stratified)",
            imbalance_strategy=None,
        ),
        "general": EvaluationFramework(
            primary_metric="AUC-ROC",
            additional_metrics=["F1 Score", "Precision", "Recall", "Confusion Matrix"],
            validation_strategy="Stratified 10-fold cross-validation",
            train_val_test_split="70% train, 15% validation, 15% test",
            imbalance_strategy=None,
        ),
    }
    combined = (field + " " + topic).lower()
    if any(w in combined for w in ["heart", "disease", "cancer", "medical", "health", "clinical"]):
        return _DEFAULT_EVAL_BY_FIELD["medical"]
    if any(w in combined for w in ["text", "nlp", "language", "sentiment", "translation"]):
        return _DEFAULT_EVAL_BY_FIELD["nlp"]
    return _DEFAULT_EVAL_BY_FIELD["general"]


def _select_baseline(citation_pool: List[VerifiedPaper]) -> Optional[LockedBaseline]:
    candidates = [p for p in citation_pool if p.is_baseline_candidate and p.key_metric_value]
    if not candidates:
        candidates = [p for p in citation_pool if p.key_metric_value]
    if not candidates:
        return None
    best = max(candidates, key=lambda p: len(p.abstract_snippet))
    return LockedBaseline(
        paper_title=best.title,
        authors=best.authors,
        year=best.year,
        metric_name=best.key_metric or "performance metric",
        metric_value=best.key_metric_value or "reported in paper",
        harvard_citation=best.harvard_citation,
        target_to_beat=(
            f"Improve upon {best.key_metric_value} {best.key_metric or 'performance'} "
            f"reported by {best.authors} ({best.year})"
        ),
    )


def _build_ethics_statement(data_sensitivity: str, dataset_name: str, field_of_study: str) -> EthicsStatement:
    """
    Determines the ethics POLICY FACTS — approval required or not, and why. This
    stays deterministic on purpose: whether IRB/institutional approval is needed
    is a compliance rule, not something an LLM should be guessing per-request.

    What changed: `statement` used to be a full ready-to-paste paragraph, and the
    methodology prompt pasted it verbatim — every project with the same
    data_sensitivity got byte-identical ethics prose. `statement` is now a short
    factual brief; the writer composes the actual paragraph from it (see
    phase3_workflow.py's ETHICS CONTEXT block), so two projects with the same
    data_sensitivity read differently while the underlying compliance facts
    (irb_required, population_bias_note) stay correct and non-negotiable.
    """
    if data_sensitivity == "public":
        brief = (
            f"{dataset_name} is publicly available under an open licence with no identifiable "
            f"personal data, so no informed consent or institutional ethics approval is required "
            f"for this secondary analysis."
        )
        return EthicsStatement(
            data_sensitivity="public", statement=brief, irb_required=False,
            population_bias_note=(
                f"Demographic representation of {dataset_name} may limit generalisation — "
                f"address this specifically for {field_of_study} research, not generically."
            ),
        )
    elif data_sensitivity == "self_collected":
        brief = (
            "This study collects primary data from human participants, which requires "
            "institutional ethics approval and informed consent before collection begins; "
            "data must be anonymised and participation must be voluntary."
        )
        return EthicsStatement(
            data_sensitivity="self_collected", statement=brief, irb_required=True,
            population_bias_note="Sample recruitment method may introduce self-selection bias.",
        )
    else:
        brief = (
            "This study uses restricted or sensitive data, requiring formal data access "
            "agreements and institutional ethics approval before any processing begins; "
            "only aggregate findings may be reported, never individual-level records."
        )
        return EthicsStatement(
            data_sensitivity="sensitive", statement=brief, irb_required=True, population_bias_note=None,
        )


def _build_dataset_citation(name: str, url: Optional[str], source: str) -> str:
    import datetime
    year = datetime.datetime.now().year
    if url:
        return f"{name} ({year}) {name}. Available at: {url} (Accessed: {datetime.datetime.now().strftime('%d %B %Y')})."
    return f"{name} ({year}) {name} dataset. {source}."


def _convert_analyzed_projects(analyzed_projects: List[AnalyzedProjectSpecSections]) -> List[SimilarProjectEntry]:
    entries = []
    for p in analyzed_projects:
        if not p.project_title:
            continue
        try:
            approach = p.methodology_used.approach_type or "Empirical study in this domain"
        except AttributeError:
            approach = "Empirical study in this domain"
        limitation = (p.limitations_identified[0] if p.limitations_identified
                      else "Does not address the specific gap identified in this study")
        entries.append(SimilarProjectEntry(
            title=p.project_title,
            author_or_institution=p.author_institution or "Unknown",
            year=p.year,
            level=p.project_type or "MSc",
            approach_summary=approach,
            limitation=limitation,
        ))
    return entries


def _extract_debates(synthesis: AnySynthesis, topic: str) -> List[str]:
    if synthesis and isinstance(synthesis, TheoreticalSynthesisB):
        if synthesis.scholarly_debates:
            return synthesis.scholarly_debates[:5]
    return [
        f"The theoretical framing of {topic} within existing disciplinary paradigms",
        f"Methodological debates regarding the study of {topic}",
        f"The relationship between {topic} and broader structural or cultural forces",
    ]


def _build_positionality(field: str, topic: str, synthesis: AnySynthesis = None) -> str:
    """
    Facts for the Methodology writer to compose an ORIGINAL positionality paragraph
    from — not a ready-made paragraph. This used to return full prose that the
    prompt handed the writer as "the positionality statement," so every Track B
    project in the same field read almost identically. Now it returns guidance
    the writer must turn into prose specific to THIS topic (see phase3_workflow.py's
    POSITIONALITY GUIDANCE block).
    """
    scholars_note = ""
    if synthesis and isinstance(synthesis, TheoreticalSynthesisB) and synthesis.key_scholars:
        scholar_names = [s.split("(")[0].strip() for s in synthesis.key_scholars[:3]]
        scholars_note = f" Engage critically with: {', '.join(scholar_names)}."
    return (
        f"Researcher's disciplinary lens: {field}. Write 2-4 original sentences on how "
        f"institutional positioning, cultural background, and disciplinary training shape "
        f"interpretive choices specifically for '{topic}' — not generic reflexivity phrasing "
        f"that could apply to any topic in this field.{scholars_note}"
    )


def _suggest_framework(field: str, topic: str, synthesis: AnySynthesis = None) -> str:
    if synthesis and isinstance(synthesis, TheoreticalSynthesisB):
        if synthesis.key_theoretical_frameworks:
            return synthesis.key_theoretical_frameworks[0]
    field_l = field.lower()
    if any(w in field_l for w in ["english", "literature", "film", "media"]):
        return "Postcolonial theory and cultural studies frameworks"
    if "law" in field_l:
        return "Critical legal studies and socio-legal theory"
    if "education" in field_l:
        return "Social constructivism and critical pedagogy (Vygotsky, 1978; Freire, 1968)"
    if "sociology" in field_l or "anthropology" in field_l:
        return "Structural functionalism and conflict theory"
    if "politics" in field_l or "policy" in field_l:
        return "Discourse analysis and critical policy studies"
    if "criminology" in field_l or "social work" in field_l:
        return "Social anomie theory and restorative justice frameworks"
    return "Interpretive and critical theoretical framework"


def _default_work_plan_a(weeks: int, algorithms: Optional[List[str]] = None) -> List[dict]:
    alg_str = ", ".join(algorithms[:2]) if algorithms else "selected models"
    if weeks <= 12:
        return [
            {"weeks": "1–2",  "activity": "Literature review, dataset acquisition and initial EDA", "deliverable": "Annotated bibliography and EDA notebook"},
            {"weeks": "3–4",  "activity": f"Data preprocessing, feature selection, baseline {alg_str}", "deliverable": "Clean dataset and baseline results"},
            {"weeks": "5–8",  "activity": f"Model development and tuning: {alg_str}", "deliverable": "Trained models with cross-validation results"},
            {"weeks": "9–10", "activity": "Evaluation, comparison, interpretability analysis", "deliverable": "Full results table with statistical significance"},
            {"weeks": "11–12","activity": "Write-up, critical reflection, submission preparation", "deliverable": "Final specification document"},
        ]
    return [
        {"weeks": "1–2",  "activity": "Literature review, gap identification, baseline confirmation", "deliverable": "Annotated bibliography and confirmed gap statement"},
        {"weeks": "3–4",  "activity": "Dataset acquisition, cleaning, exploratory data analysis (EDA)", "deliverable": "Clean dataset with EDA report"},
        {"weeks": "5–6",  "activity": "Feature engineering, preprocessing pipeline, class imbalance handling", "deliverable": "Preprocessing pipeline and feature importance analysis"},
        {"weeks": "7–10", "activity": f"Model development: {alg_str} — training, cross-validation, hyperparameter tuning", "deliverable": "Trained models with cross-validation scores"},
        {"weeks": "11–12","activity": "Evaluation against baseline, interpretability (SHAP/LIME if applicable)", "deliverable": "Results table with statistical significance tests"},
        {"weeks": "13–14","activity": "Critical analysis, limitations discussion, ethical reflection", "deliverable": "Discussion and ethics sections drafted"},
        {"weeks": "15",   "activity": "Final write-up, proofreading, submission", "deliverable": "Completed specification document"},
    ]


def _default_work_plan_b(weeks: int) -> List[dict]:
    if weeks <= 12:
        return [
            {"weeks": "1–3",  "activity": "Systematic literature review and theoretical framework selection", "deliverable": "Annotated bibliography and framework rationale"},
            {"weeks": "4–6",  "activity": "Primary source analysis using the chosen framework", "deliverable": "Analytical notes and key themes"},
            {"weeks": "7–9",  "activity": "Argument development, engagement with scholarly debates", "deliverable": "Drafted analysis sections"},
            {"weeks": "10–12","activity": "Write-up, critical reflection, positionality statement, submission", "deliverable": "Final specification document"},
        ]
    return [
        {"weeks": "1–3",  "activity": "Systematic literature review: identify key texts, debates, and theoretical approaches", "deliverable": "Annotated bibliography (min. 20 sources)"},
        {"weeks": "4–5",  "activity": "Theoretical framework selection and justification", "deliverable": "Framework rationale document"},
        {"weeks": "6–8",  "activity": "Primary source analysis using the chosen analytical lens", "deliverable": "Close reading notes and thematic coding"},
        {"weeks": "9–11", "activity": "Argument development, engaging with competing scholarly positions", "deliverable": "Drafts of analysis and literature review sections"},
        {"weeks": "12–13","activity": "Critical synthesis, positionality reflection, ethical considerations", "deliverable": "Positionality and ethics sections"},
        {"weeks": "14–15","activity": "Final write-up, editing, proofreading, submission", "deliverable": "Completed specification document"},
    ]


def _build_section_targets(guidelines: ProjectGuidelines) -> dict:
    _DEFAULT_SECTION_TARGETS = {
        "Abstract":               300,
        "Justification and Aim":  400,
        "Objectives":             300,
        "Literature Review":      800,
        "Methodology":            900,
        "Work Plan":              300,
    }
    targets = {}
    for s in guidelines.sections:
        targets[s.section_name] = s.word_count
    if not targets:
        return _DEFAULT_SECTION_TARGETS.copy()
    return targets


_ECONOMETRIC_DATA_HINTS: dict = {
    "impact investing":    ["GIIN IRIS+ Platform (thegiin.org)", "ANDE (andeglobal.org)"],
    "employment":          ["World Bank Enterprise Survey (wbenterprisesurveys.org)", "ILO ILOSTAT (ilostat.ilo.org)"],
    "foreign investment":  ["UNCTAD FDI Statistics (unctad.org)", "World Bank WDI (databank.worldbank.org)"],
    "firm performance":    ["Compustat via WRDS", "Orbis — Bureau van Dijk"],
    "macroeconomics":      ["IMF World Economic Outlook (imf.org)", "Penn World Tables (pwt.upenn.edu)"],
    "africa":              ["Mo Ibrahim Foundation Data (moibrahimfoundation.org)", "African Development Bank Statistics (afdb.org)"],
    "financial":           ["CRSP", "Compustat", "Bloomberg Terminal (institutional access)"],
    "poverty":             ["World Bank PovcalNet", "UNDP Human Development Reports"],
    "health economics":    ["WHO Global Health Observatory (who.int/data/gho)", "DHS Program (dhsprogram.com)"],
}


def _get_econometric_data_hint(topic: str) -> Optional[str]:
    topic_l = topic.lower()
    for keyword, sources in _ECONOMETRIC_DATA_HINTS.items():
        if keyword in topic_l:
            return "Recommended data sources for this econometric topic: " + "; ".join(sources)
    return None


def build_locked_requirements(
    field_of_study: str,
    research_topic: str,
    academic_level: str,
    dataset_source: str,
    data_sensitivity: str,
    citation_pool: List[VerifiedPaper],
    analyzed_projects: List[AnalyzedProjectSpecSections],
    guidelines: ProjectGuidelines,
    dataset_name: Optional[str] = None,
    dataset_url: Optional[str] = None,
    dataset_description: Optional[str] = None,
    dataset_size: Optional[str] = None,
    student_success_statement: Optional[str] = None,
    preferred_algorithms: Optional[str] = None,
    research_nature: Optional[str] = None,
    theoretical_framework: Optional[str] = None,
    central_argument: Optional[str] = None,
    primary_source_focus: Optional[str] = None,
    synthesis: AnySynthesis = None,
    dataset_profile: Optional["DatasetProfile"] = None,
) -> Union[LockedRequirementsA, LockedRequirementsB]:

    track = detect_track(field_of_study, research_topic)
    timeline_weeks = guidelines.timeline_weeks or 15
    section_targets = _build_section_targets(guidelines)
    similar_projects = _convert_analyzed_projects(analyzed_projects)
    citation_style = guidelines.citation_style or "Harvard"

    print("\n🔒 LOCKED REQUIREMENTS BUILDER")
    print(f"   Track: {track} | Timeline: {timeline_weeks} weeks")
    print(f"   Citation pool: {len(citation_pool)} verified papers")
    print(f"   Similar projects: {len(similar_projects)}")
    if synthesis:
        print(f"   Synthesis type: {type(synthesis).__name__}")

    if track == "A":
        paradigm = detect_paradigm(
            field_of_study=field_of_study,
            research_topic=research_topic,
            research_nature=research_nature,
            preferred_algorithms=preferred_algorithms,
        )
        print(f"   📐 Paradigm: {paradigm.value}")

        _has_profile = dataset_profile is not None and not dataset_profile.is_fallback
        _size_str = (
            f"{dataset_profile.row_count:,} rows × {dataset_profile.column_count} columns"
            if _has_profile else dataset_size
        )
        _desc_str = dataset_description or f"Dataset for {research_topic} research"

        _missing_summary = None
        _quality_notes = None
        if _has_profile:
            high_missing = [f"{c.name}: {c.missing_pct}%" for c in dataset_profile.columns if c.missing_pct > 5]
            _missing_summary = "; ".join(high_missing) if high_missing else "No significant missing values"
            _quality_notes = (
                f"{dataset_profile.duplicate_row_count} duplicate rows detected"
                if dataset_profile.duplicate_row_count > 0
                else "No duplicate rows detected"
            )
            print(f"   ✅ Dataset profile injected: {dataset_profile.row_count:,} rows, {dataset_profile.column_count} columns")

        if paradigm == ResearchParadigm.ECONOMETRIC_CAUSAL and not dataset_name:
            _econ_hint = _get_econometric_data_hint(research_topic)
            if _econ_hint:
                _desc_str = _econ_hint

        confirmed_dataset = LockedDataset(
            name=dataset_name or "To be confirmed during data acquisition phase",
            source=dataset_source,
            access_url=dataset_url,
            description=_desc_str,
            size=_size_str,
            is_public=(data_sensitivity == "public" or dataset_source == "public"),
            harvard_citation=_build_dataset_citation(dataset_name or "Dataset", dataset_url, dataset_source),
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

        baseline = None
        if paradigm == ResearchParadigm.ML_CLASSIFICATION:
            baseline = _select_baseline(citation_pool)
            if not baseline:
                print("   ⚠️  No baseline found in citation pool — baseline set to None.")
            else:
                print(f"   ✅ Baseline: {baseline.authors} ({baseline.year}) — {baseline.metric_value}")
        else:
            print(f"   ℹ️  Baseline not applicable for {paradigm.value} — set to None.")

        evaluation = _pick_evaluation_framework_by_paradigm(field_of_study, research_topic, paradigm)
        ethics = _build_ethics_statement(data_sensitivity=data_sensitivity, dataset_name=confirmed_dataset.name, field_of_study=field_of_study)
        algorithms, justifications = _pick_methods(field=field_of_study, topic=research_topic, synthesis=synthesis, paradigm=paradigm, preferred_algorithms=preferred_algorithms)

        xai = None
        if paradigm == ResearchParadigm.ML_CLASSIFICATION:
            xai = _pick_xai(field_of_study, research_topic, synthesis)

        work_plan = _default_work_plan_a(timeline_weeks, algorithms=algorithms)

        causal_strategy = stat_software = data_structure = None
        measurement_instrument = reliability_test = sample_size_target = None
        system_type = eval_env = None

        if paradigm == ResearchParadigm.ECONOMETRIC_CAUSAL:
            topic_l = research_topic.lower()
            if "impact" in topic_l or "effect" in topic_l:
                causal_strategy = "Propensity Score Matching (PSM) + OLS baseline"
            elif "panel" in topic_l or "longitudinal" in topic_l:
                causal_strategy = "Fixed Effects / Random Effects panel regression (Hausman, 1978)"
            else:
                causal_strategy = "OLS Multiple Regression with robust standard errors"
            stat_software = "R (packages: plm, MatchIt, stargazer) or Stata (xtreg, psmatch2)"
            data_structure = "cross-sectional" if "panel" not in research_topic.lower() else "panel"
        elif paradigm == ResearchParadigm.SURVEY_QUANTITATIVE:
            measurement_instrument = "5-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree)"
            reliability_test = "Cronbach's Alpha (target: α > 0.7 per Nunnally, 1978)"
            sample_size_target = "minimum 100 respondents (G*Power, α = 0.05, power = 0.80)"
        elif paradigm == ResearchParadigm.SYSTEMS_ENGINEERING:
            topic_l = research_topic.lower()
            if "web" in topic_l: system_type = "web application"
            elif "mobile" in topic_l or "app" in topic_l: system_type = "mobile application"
            elif "api" in topic_l: system_type = "REST API service"
            else: system_type = "software system"
            eval_env = "Docker containerised environment on cloud VM (AWS/GCP t2.medium or equivalent)"

        locked = LockedRequirementsA(
            paradigm=paradigm,
            research_topic=research_topic, field_of_study=field_of_study,
            academic_level=academic_level, timeline_weeks=timeline_weeks,
            citation_pool=citation_pool, confirmed_dataset=confirmed_dataset,
            baseline=baseline, similar_projects=similar_projects,
            evaluation=evaluation, ethics=ethics, xai_techniques=xai,
            algorithms=algorithms, algorithm_justifications=justifications,
            work_plan_weeks=work_plan, student_success_statement=student_success_statement,
            causal_identification_strategy=causal_strategy, statistical_software=stat_software,
            data_structure=data_structure, measurement_instrument=measurement_instrument,
            reliability_test=reliability_test, sample_size_target=sample_size_target,
            system_type=system_type, evaluation_environment=eval_env,
            target_word_count=guidelines.target_word_count or 3000,
            citation_style=citation_style, section_word_targets=section_targets,
        )
        print(f"   ✅ LockedRequirementsA assembled — paradigm: {paradigm.value}")
        return locked

    else:
        scholarly_debates = _extract_debates(synthesis, research_topic)

        if synthesis and isinstance(synthesis, TheoreticalSynthesisB) and synthesis.key_theoretical_frameworks:
            framework_to_use = theoretical_framework or synthesis.key_theoretical_frameworks[0]
        else:
            framework_to_use = theoretical_framework or _suggest_framework(field_of_study, research_topic, synthesis)

        if synthesis and isinstance(synthesis, TheoreticalSynthesisB) and synthesis.research_positioning:
            framework_justification = synthesis.research_positioning
        else:
            framework_justification = (
                f"This framework is appropriate for {research_topic} because it provides "
                f"analytical tools to examine the underlying structures, power relations, "
                f"and cultural contexts that shape the subject matter."
            )

        positionality = _build_positionality(field_of_study, research_topic, synthesis)
        work_plan = _default_work_plan_b(timeline_weeks)

        locked = LockedRequirementsB(
            research_topic=research_topic, field_of_study=field_of_study,
            academic_level=academic_level, timeline_weeks=timeline_weeks,
            citation_pool=citation_pool,
            theoretical_framework=framework_to_use,
            framework_justification=framework_justification,
            central_argument=central_argument or (
                f"This project argues that {research_topic} can be understood through "
                f"a critical examination of the social, cultural, and structural factors "
                f"that shape its production and reception."
            ),
            primary_source_focus=primary_source_focus or (
                synthesis.primary_source_suggestions[0]
                if synthesis and isinstance(synthesis, TheoreticalSynthesisB)
                   and synthesis.primary_source_suggestions
                else None
            ),
            scholarly_debates=scholarly_debates,
            similar_projects=similar_projects,
            positionality_statement=positionality,
            work_plan_weeks=work_plan,
            target_word_count=guidelines.target_word_count or 3000,
            citation_style=citation_style,
            section_word_targets=section_targets,
        )

        print("   ✅ LockedRequirementsB assembled")
        print(f"      Framework: {framework_to_use[:60]}…")
        print(f"      Debates: {len(scholarly_debates)} identified")
        return locked