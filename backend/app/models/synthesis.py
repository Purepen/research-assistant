"""
Strategic Synthesis Models

Extracted from: Notebook Cell 2
Purpose: Structures for strategic positioning and differentiation analysis
Why: Ensures project is novel/differentiated, not just copying existing work

TRACK B ADDITION:
  TheoreticalSynthesisB — a completely separate model for humanities/theoretical
  projects. StrategicSynthesis remains unchanged and is used exclusively for Track A.
  Phase 2 workflow selects which model to populate based on detected track.
"""

from pydantic import BaseModel, Field
from typing import List


class ProjectGap(BaseModel):
    gap_description: str = Field(description="Description of identified gap")
    opportunity: str = Field(description="Opportunity this gap presents")


class StrategicDifferentiationPoint(BaseModel):
    aspect: str = Field(description="Aspect to differentiate on")
    implementation: str = Field(description="How to implement this differentiation")


class NovelContributionClaim(BaseModel):
    claim: str = Field(description="What is novel about this work")
    justification: str = Field(description="Why this is considered novel")


class StrategicSynthesis(BaseModel):
    """
    Strategic positioning for Track A (empirical / data / ML) projects.
    This model is UNCHANGED — all Track A behaviour is preserved exactly.
    """

    positioning_statement: str = Field(
        description="Overall strategic positioning (2-3 sentences)"
    )

    differentiation_strategy: List[StrategicDifferentiationPoint] = Field(
        description="How this project differs from existing work"
    )

    novel_contributions: List[NovelContributionClaim] = Field(
        description="Novel contributions this project will make"
    )

    performance_targets: str = Field(
        description="Realistic performance/outcome targets"
    )

    risk_factors: List[str] = Field(
        description="Potential risks and challenges"
    )

    mitigation_strategies: List[str] = Field(
        description="How to mitigate identified risks"
    )


# ─── NEW: Track B Theoretical Synthesis ──────────────────────────────────────

class TheoreticalSynthesisB(BaseModel):
    """
    Strategic positioning for Track B (theoretical / humanities / social science) projects.

    Completely separate from StrategicSynthesis — no datasets, no performance targets,
    no ML concepts. Fields are grounded in humanities research practice:
    theoretical frameworks, scholarly debates, key scholars, and analytical approaches.

    This object is passed to build_locked_requirements() for Track B and populates:
      - locked.scholarly_debates  ← from scholarly_debates
      - locked.theoretical_framework ← from key_theoretical_frameworks[0] if not student-supplied
      - locked.framework_justification ← from research_positioning
      - positionality enrichment ← from key_scholars
    """

    research_positioning: str = Field(
        description=(
            "How this project positions itself within the field's existing scholarly landscape. "
            "2-3 sentences: what the existing literature says, where it falls short, "
            "and how this project addresses that. No ML language."
        )
    )

    key_theoretical_frameworks: List[str] = Field(
        description=(
            "The 2-3 most relevant theoretical frameworks for this specific topic. "
            "Each entry must name the framework AND its founding or key scholar(s). "
            "Example: 'Social constructivism (Vygotsky, 1978; Berger and Luckmann, 1966)' "
            "or 'Postcolonial theory (Fanon, 1961; Bhabha, 1994; Spivak, 1988)'. "
            "These are used to populate theoretical_framework in LockedRequirementsB."
        )
    )

    scholarly_debates: List[str] = Field(
        description=(
            "3-5 active, named scholarly debates in this field that this research engages with. "
            "Each must be a real debate, not a generic statement. "
            "Example: 'The debate between structuralist and post-structuralist readings of X' "
            "or 'Whether restorative justice approaches reduce recidivism in adolescent populations'. "
            "These are passed directly to the methodology and justification agents."
        )
    )

    key_scholars: List[str] = Field(
        description=(
            "4-6 scholars — both foundational figures and contemporary contributors — "
            "who are central to this field and topic. "
            "Format: 'Name (Year of key work) — contribution or position'. "
            "Example: 'Émile Durkheim (1897) — foundational work on social anomie and deviance'. "
            "Used to enrich positionality and literature review context."
        )
    )

    analytical_approaches: List[str] = Field(
        description=(
            "2-4 specific analytical methodologies appropriate for this topic and field. "
            "These are NOT research methods in the Track A sense — they are interpretive tools. "
            "Example: 'Thematic analysis (Braun and Clarke, 2006)', "
            "'Critical discourse analysis (Fairclough, 1992)', "
            "'Comparative case analysis', 'Close textual reading'. "
            "One of these will become the analytical methodology in the Methodology section."
        )
    )

    primary_source_suggestions: List[str] = Field(
        description=(
            "2-4 suggestions for primary source types or specific corpora relevant to this topic. "
            "Example: 'Official government education policy documents (2015–2024)', "
            "'Published reports from UNICEF and UNESCO on Nigerian adolescent behaviour', "
            "'Student disciplinary records (if ethics approved access is available)'. "
            "Helps the student and methodology agent define what primary material to use."
        )
    )

    research_gaps: List[str] = Field(
        description=(
            "3-4 specific, concrete gaps in the existing scholarship that this project addresses. "
            "Each gap must be precise — not 'little research exists' but "
            "'No study has examined how Nigeria-specific socioeconomic factors interact with "
            "post-pandemic school re-entry to produce elevated anti-social behaviour rates'. "
            "These are used by the justification agent to build the gap argument."
        )
    )

    risk_factors: List[str] = Field(
        description=(
            "2-4 risks specific to this type of theoretical/qualitative research. "
            "Examples: 'Limited access to primary sources without institutional affiliation', "
            "'Researcher positionality may introduce interpretive bias', "
            "'Scope creep across the theoretical framework if multiple lenses applied'. "
            "NOT the same as Track A computational risks."
        )
    )

    mitigation_strategies: List[str] = Field(
        description=(
            "One mitigation strategy per risk factor, in the same order. "
            "Examples: 'Use publicly available government and NGO reports as primary corpus', "
            "'Maintain a reflective research journal and include positionality statement'."
        )
    )