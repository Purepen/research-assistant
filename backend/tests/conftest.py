"""Shared factories for the WS0 test suite.

make_ml_spec() builds a ProjectSpecification that passes every hard item of the
ML_CLASSIFICATION validator checklist, so tests can start from green and break
one thing at a time.
"""

from app.models.specification import ProjectSpecification, SpecificationSection

# Filler deliberately avoids every validator signal word (dataset/split/metric/
# ethics/month/marketing terms) so padding never flips a checklist item.
_FILLER = (
    "the inquiry proceeds through structured stages of reading drafting revision "
    "and careful argument development across successive chapters of the report "
).split()


def _pad(text: str, target_words: int) -> str:
    words = text.split()
    while len(words) < target_words:
        words.extend(_FILLER)
    return " ".join(words[:target_words])


def _citations(n: int) -> str:
    names = ["Smith", "Jones", "Chen", "Okafor", "Garcia", "Patel", "Nguyen",
             "Brown", "Kim", "Adeyemi", "Muller", "Rossi", "Tanaka", "Silva"]
    return " ".join(
        f"Prior work established this ({names[i % len(names)]}, {2015 + (i % 9)})."
        for i in range(n)
    )


def make_section(name: str, content: str, target_words: int) -> SpecificationSection:
    padded = _pad(content, target_words)
    return SpecificationSection(
        section_name=name,
        content=padded,
        word_count=len(padded.split()),
        key_points=["point one", "point two", "point three"],
    )


ML_METHODOLOGY_CORE = (
    "The study uses the UCI Heart Disease dataset of 303 records. "
    "An 80% / 20% train and test split with 10-fold cross-validation is applied. "
    "Evaluation uses F1-score, AUC-ROC, precision and recall beyond raw accuracy, "
    "against a published baseline accuracy of 87.4%. "
    "The data is public under an open licence and fully anonymised, and the "
    "ethical implications and privacy limitations are addressed explicitly. "
)

WEEKLY_WORK_PLAN_CORE = (
    "Week 1-2: literature familiarisation. Weeks 3-5: preparation and cleaning. "
    "Weeks 6-9: experimentation. Weeks 10-12: evaluation. Weeks 13-15: writing up. "
)


def make_ml_spec(
    words_per_section: int = 120,
    citations: int = 12,
    methodology_extra: str = "",
    work_plan_core: str = WEEKLY_WORK_PLAN_CORE,
) -> ProjectSpecification:
    """A Track A / ML spec that passes all hard checklist items by default."""
    sections = {
        "Abstract": "This study investigates classification performance on clinical records. ",
        "Justification and Aim": "The problem carries significant weight for early detection. ",
        "Objectives": "1. Review sources. 2. Prepare inputs. 3. Build classifiers. "
                      "4. Evaluate outcomes. 5. Report findings. ",
        "Literature Review": _citations(citations),
        "Methodology": ML_METHODOLOGY_CORE + methodology_extra,
        "Work Plan": work_plan_core,
    }
    built = {
        name: make_section(name, content, words_per_section)
        for name, content in sections.items()
    }
    total = sum(s.word_count for s in built.values())
    return ProjectSpecification(
        project_title="Machine Learning Classification of Heart Disease Risk",
        abstract=built["Abstract"],
        justification_and_aim=built["Justification and Aim"],
        objectives=built["Objectives"],
        literature_review=built["Literature Review"],
        methodology=built["Methodology"],
        work_plan=built["Work Plan"],
        references=[f"Reference entry {i}" for i in range(1, 11)],
        total_word_count=total,
    )


def small_targets(words: int = 100) -> dict:
    """Section targets sized so make_ml_spec(words_per_section=120) passes 85%."""
    return {
        "Abstract": words,
        "Justification and Aim": words,
        "Objectives": words,
        "Literature Review": words,
        "Methodology": words,
        "Work Plan": words,
    }
