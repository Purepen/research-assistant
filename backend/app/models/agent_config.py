"""
Agent Model Configuration
=========================

Central registry for the model tier system.

Three tiers:
  TESTING    — all gpt-4o-mini, cheapest, fast, good for verifying structure
  PRODUCTION — recommended defaults (gpt-4o-mini for most, gpt-4o for
               quality-critical agents: reviewer and strategic synthesizer)
  CUSTOM     — user picks a model per agent individually from the UI

Architecture:
  Every agent definition file imports `AgentModelConfig` and exposes a
  factory function `build_<phase>_agents(config: AgentModelConfig)` that
  returns agent instances built with the models from the config.

  The main pipeline resolves the user's tier → AgentModelConfig once at
  the start of generation and passes it into every phase.

Extending:
  To add a new agent: add its key to AgentKey, add an AgentMeta entry to
  AGENT_REGISTRY with display_name / description / phase / cost_impact /
  production_model. The tier presets are built automatically.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel


# ─── Available models ─────────────────────────────────────────────────────────

AVAILABLE_MODELS: List[Dict] = [
    {
        "id":          "gpt-4o-mini",
        "label":       "GPT-4o Mini",
        "description": "Fast and cheap. Good for most tasks.",
        "tier_badge":  "cheapest",
    },
    {
        "id":          "gpt-4o",
        "label":       "GPT-4o",
        "description": "More capable. Higher cost per call.",
        "tier_badge":  "recommended",
    },
    {
        "id":          "gpt-4.1-mini",
        "label":       "GPT-4.1 Mini",
        "description": "Latest mini model — faster than 4o-mini.",
        "tier_badge":  "latest",
    },
    {
        "id":          "gpt-4.1",
        "label":       "GPT-4.1",
        "description": "Latest flagship — highest quality, highest cost.",
        "tier_badge":  "latest",
    },
]

AVAILABLE_MODEL_IDS = [m["id"] for m in AVAILABLE_MODELS]


# ─── Tier enum ────────────────────────────────────────────────────────────────

class ModelTier(str, Enum):
    """
    Which model tier the user has selected in their settings.

    TESTING    — all gpt-4o-mini, designed for quick spec verification
    PRODUCTION — recommended production defaults (best quality/cost balance)
    CUSTOM     — user has configured each agent individually
    """
    TESTING    = "testing"
    PRODUCTION = "production"
    CUSTOM     = "custom"


# ─── Agent keys ───────────────────────────────────────────────────────────────

class AgentKey(str, Enum):
    """
    Stable identifier for every agent in the system.
    These are stored as-is in the user's custom_model_config JSON column.
    Do not rename existing keys — that would break stored user configs.
    """
    # Phase 1 — Resource Discovery
    WEB_SEARCHER            = "web_searcher"
    RESOURCE_FINDER         = "resource_finder"
    PROJECT_FINDER          = "project_finder"
    PROJECT_ANALYZER        = "project_analyzer"
    PAST_PROJECTS_ANALYZER  = "past_projects_analyzer"
    PAPER_FETCHER           = "paper_fetcher"

    # Phase 2 — Strategic Synthesis
    STRATEGIC_SYNTHESIZER   = "strategic_synthesizer"
    THEORETICAL_SYNTHESIZER = "theoretical_synthesizer"

    # Phase 3 — Specification Writing
    JUSTIFICATION_SPECIALIST = "justification_specialist"
    OBJECTIVES_ARCHITECT     = "objectives_architect"
    LITERATURE_STRATEGIST    = "literature_strategist"
    METHODOLOGY_DESIGNER     = "methodology_designer"
    TIMELINE_VALIDATOR       = "timeline_validator"
    REFERENCES_COMPILER      = "references_compiler"
    ABSTRACT_SPECIALIST      = "abstract_specialist"
    FEASIBILITY_ANALYST      = "feasibility_analyst"

    # Phase 4 — Orchestration & Formatting
    SPECIFICATION_ORCHESTRATOR = "specification_orchestrator"
    SPECIFICATION_FORMATTER    = "specification_formatter"

    # Phase 5 — Review
    PROFESSOR_REVIEWER = "professor_reviewer"

    # Phase 6 — Email
    EMAIL_AGENT = "email_agent"


# ─── Agent metadata ───────────────────────────────────────────────────────────

class AgentMeta(BaseModel):
    """
    Full metadata for one agent — used to render the Custom tier UI.
    display_name and description are shown to the user in the settings panel.
    """
    key:              AgentKey
    display_name:     str
    description:      str    # one sentence, plain English — shown in the UI card
    phase:            str    # "Discovery", "Synthesis", "Writing", "Review", "Delivery"
    cost_impact:      str    # "Low" | "Medium" | "High" — rough guide for users
    testing_model:    str    # always gpt-4o-mini
    production_model: str    # recommended model for real use


# ─── Registry — every agent in the system ─────────────────────────────────────

AGENT_REGISTRY: List[AgentMeta] = [

    # ── Phase 1: Resource Discovery ───────────────────────────────────────────
    AgentMeta(
        key=AgentKey.WEB_SEARCHER,
        display_name="Web Searcher",
        description="Performs raw web searches to find papers, datasets, tools, and similar projects.",
        phase="Discovery",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.RESOURCE_FINDER,
        display_name="Resource Finder",
        description="Extracts and structures relevant papers, datasets, and methods from search results.",
        phase="Discovery",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.PROJECT_FINDER,
        display_name="Project Finder",
        description="Finds URLs of similar student theses and dissertations for comparative analysis.",
        phase="Discovery",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.PROJECT_ANALYZER,
        display_name="Project Analyzer",
        description="Fetches and deeply analyses each discovered student project to extract methodology, limitations, and gaps.",
        phase="Discovery",
        cost_impact="Medium",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.PAST_PROJECTS_ANALYZER,
        display_name="Past Projects Analyzer",
        description="Reads and analyses student-uploaded past project files to identify relevant patterns and gaps.",
        phase="Discovery",
        cost_impact="Medium",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.PAPER_FETCHER,
        display_name="Paper Abstract Fetcher",
        description="Fetches real abstracts and DOIs for discovered papers, building a verified citation pool.",
        phase="Discovery",
        cost_impact="Medium",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),

    # ── Phase 2: Strategic Synthesis ──────────────────────────────────────────
    AgentMeta(
        key=AgentKey.STRATEGIC_SYNTHESIZER,
        display_name="Strategic Synthesizer",
        description="Creates the strategic positioning for empirical projects — identifies novel contributions, risks, and performance targets.",
        phase="Synthesis",
        cost_impact="Medium",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o",
    ),
    AgentMeta(
        key=AgentKey.THEORETICAL_SYNTHESIZER,
        display_name="Theoretical Synthesizer",
        description="Creates the scholarly positioning for theoretical projects — frameworks, debates, key scholars, and research gaps.",
        phase="Synthesis",
        cost_impact="Medium",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o",
    ),

    # ── Phase 3: Specification Writing ────────────────────────────────────────
    AgentMeta(
        key=AgentKey.JUSTIFICATION_SPECIALIST,
        display_name="Justification Specialist",
        description="Writes the Justification and Overall Aim section — real-world significance, gap analysis, and research aim.",
        phase="Writing",
        cost_impact="Medium",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.OBJECTIVES_ARCHITECT,
        display_name="Objectives Architect",
        description="Writes the Objectives section — five sequenced, measurable objectives aligned to the research aim.",
        phase="Writing",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.LITERATURE_STRATEGIST,
        display_name="Literature Strategist",
        description="Writes the Literature Review — synthesises papers, compares findings, and identifies the specific research gap.",
        phase="Writing",
        cost_impact="High",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.METHODOLOGY_DESIGNER,
        display_name="Methodology Designer",
        description="Writes the Methodology section — dataset, algorithms or theoretical approach, evaluation, ethics, and work plan.",
        phase="Writing",
        cost_impact="High",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.TIMELINE_VALIDATOR,
        display_name="Timeline Validator",
        description="Writes the Work Plan section — a week-by-week schedule with deliverables and risk mitigation.",
        phase="Writing",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.REFERENCES_COMPILER,
        display_name="References Compiler",
        description="Compiles the complete Harvard reference list from the verified citation pool — no invented citations.",
        phase="Writing",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.ABSTRACT_SPECIALIST,
        display_name="Abstract Specialist",
        description="Writes the Abstract last — after all sections are complete — to ensure it accurately summarises the full spec.",
        phase="Writing",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.FEASIBILITY_ANALYST,
        display_name="Feasibility Analyst",
        description="Assesses whether the proposed project is achievable within the timeline and resources available.",
        phase="Writing",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),

    # ── Phase 4: Orchestration & Formatting ───────────────────────────────────
    AgentMeta(
        key=AgentKey.SPECIFICATION_ORCHESTRATOR,
        display_name="Specification Orchestrator",
        description="Coordinates all section writers and assembles their outputs into a coherent specification structure.",
        phase="Assembly",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
    AgentMeta(
        key=AgentKey.SPECIFICATION_FORMATTER,
        display_name="Specification Formatter",
        description="Formats the assembled specification into the final ProjectSpecification object with correct structure.",
        phase="Assembly",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),

    # ── Phase 5: Review ───────────────────────────────────────────────────────
    AgentMeta(
        key=AgentKey.PROFESSOR_REVIEWER,
        display_name="Professor Reviewer",
        description="Acts as an academic examiner — scores every section against marking criteria and flags hard failures.",
        phase="Review",
        cost_impact="High",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o",
    ),

    # ── Phase 6: Delivery ─────────────────────────────────────────────────────
    AgentMeta(
        key=AgentKey.EMAIL_AGENT,
        display_name="Email Agent",
        description="Composes and sends the specification delivery email to the student.",
        phase="Delivery",
        cost_impact="Low",
        testing_model="gpt-4o-mini",
        production_model="gpt-4o-mini",
    ),
]

# Fast lookup by key
AGENT_REGISTRY_BY_KEY: Dict[AgentKey, AgentMeta] = {a.key: a for a in AGENT_REGISTRY}


# ─── AgentModelConfig — runtime config object ─────────────────────────────────

class AgentModelConfig(BaseModel):
    """
    Maps every AgentKey to a concrete model string.
    This is the object passed into every pipeline phase.
    Build it once per generation from the user's stored tier + custom config.
    """
    models: Dict[str, str]  # AgentKey.value → model id string

    def get(self, key: AgentKey) -> str:
        """Return the model for this agent. Falls back to gpt-4o-mini if somehow missing."""
        return self.models.get(key.value, "gpt-4o-mini")

    @classmethod
    def for_tier(
        cls,
        tier: ModelTier,
        custom_config: Optional[Dict[str, str]] = None,
    ) -> "AgentModelConfig":
        """
        Build an AgentModelConfig from a tier + optional custom overrides.

        TESTING    → every agent gets its testing_model (all gpt-4o-mini)
        PRODUCTION → every agent gets its production_model
        CUSTOM     → starts from production defaults, then applies custom_config overrides
        """
        if tier == ModelTier.TESTING:
            models = {a.key.value: a.testing_model for a in AGENT_REGISTRY}

        elif tier == ModelTier.PRODUCTION:
            models = {a.key.value: a.production_model for a in AGENT_REGISTRY}

        elif tier == ModelTier.CUSTOM:
            # Start from production defaults so unset agents aren't broken
            models = {a.key.value: a.production_model for a in AGENT_REGISTRY}
            # Apply user's custom overrides, but only for valid agent keys + valid model ids
            if custom_config:
                valid_keys = {a.key.value for a in AGENT_REGISTRY}
                for agent_key, model_id in custom_config.items():
                    if agent_key in valid_keys and model_id in AVAILABLE_MODEL_IDS:
                        models[agent_key] = model_id
                    # silently skip invalid keys/models — don't crash on bad stored data

        else:
            # Safe fallback — should never happen
            models = {a.key.value: a.testing_model for a in AGENT_REGISTRY}

        return cls(models=models)


# ─── Helper: build config from user DB row ───────────────────────────────────

def build_agent_config_for_user(
    model_tier: Optional[str],
    custom_model_config: Optional[Dict],
) -> AgentModelConfig:
    """
    Convenience function called in the pipeline.
    Accepts the raw DB column values and returns a ready AgentModelConfig.

    model_tier:          User.model_tier (string or None → defaults to PRODUCTION)
    custom_model_config: User.custom_model_config (JSON dict or None)
    """
    try:
        tier = ModelTier(model_tier) if model_tier else ModelTier.PRODUCTION
    except ValueError:
        tier = ModelTier.PRODUCTION

    return AgentModelConfig.for_tier(tier=tier, custom_config=custom_model_config)
