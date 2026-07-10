"""Regression tests for Bug #2: BYOK model-tier selection silently no-oped for
Phases 1 and 3.

phase1_workflow.py / phase3_workflow.py imported build_phase1_agents /
build_phase3_agents inside a try/except, but neither factory existed — any
agent_model_config silently fell through to default gpt-4o-mini singletons.
These tests pin the factories' existence, their dict contract with the
workflow call sites, and that the configured model actually reaches each agent.
"""

from agents import WebSearchTool

from app.core.agents.definitions.phase1_agents import build_phase1_agents
from app.core.agents.definitions.phase3_agents import build_phase3_agents
from app.core.pipelines.phase1_workflow import _resolve_phase1_agents
from app.models.agent_config import AgentKey, AgentModelConfig, ModelTier

PHASE1_KEYS = {
    "web_searcher", "resource_finder", "project_finder",
    "project_analyzer", "past_projects_analyzer",
}
PHASE3_KEYS = {
    "justification_specialist", "objectives_architect", "literature_strategist",
    "methodology_designer", "timeline_validator", "references_compiler",
    "abstract_specialist",
}


def _config(model: str, **overrides: str) -> AgentModelConfig:
    models = {key.value: model for key in AgentKey}
    models.update(overrides)
    return AgentModelConfig(models=models)


def test_phase1_factory_returns_workflow_contract_keys():
    agents = build_phase1_agents(_config("gpt-4.1"))
    assert set(agents.keys()) == PHASE1_KEYS


def test_phase3_factory_returns_workflow_contract_keys():
    agents = build_phase3_agents(_config("gpt-4.1"))
    assert set(agents.keys()) == PHASE3_KEYS


def test_phase1_factory_applies_configured_models():
    config = _config("gpt-4.1", **{AgentKey.RESOURCE_FINDER.value: "gpt-4o"})
    agents = build_phase1_agents(config)
    assert agents["resource_finder"].model == "gpt-4o"
    for key in PHASE1_KEYS - {"resource_finder"}:
        assert agents[key].model == "gpt-4.1"


def test_phase3_factory_applies_configured_models():
    config = _config("gpt-4.1", **{AgentKey.METHODOLOGY_DESIGNER.value: "gpt-4o"})
    agents = build_phase3_agents(config)
    assert agents["methodology_designer"].model == "gpt-4o"
    for key in PHASE3_KEYS - {"methodology_designer"}:
        assert agents[key].model == "gpt-4.1"


def test_phase1_factory_preserves_tools_and_output_types():
    agents = build_phase1_agents(_config("gpt-4.1"))
    assert any(isinstance(t, WebSearchTool) for t in agents["web_searcher"].tools)
    assert any(isinstance(t, WebSearchTool) for t in agents["project_finder"].tools)
    for key, singleton_key in [
        ("resource_finder", "resource_finder"),
        ("project_analyzer", "project_analyzer"),
        ("past_projects_analyzer", "past_projects_analyzer"),
    ]:
        assert agents[key].output_type is _resolve_phase1_agents(None)[singleton_key].output_type


def test_resolver_uses_config_not_defaults():
    """The Bug #2 symptom: a non-default tier must actually change the model."""
    resolved = _resolve_phase1_agents(_config("gpt-4.1"))
    singletons = _resolve_phase1_agents(None)
    for key in PHASE1_KEYS:
        assert resolved[key].model == "gpt-4.1"
        assert singletons[key].model == "gpt-4o-mini"


def test_testing_tier_resolves_all_mini():
    config = AgentModelConfig.for_tier(ModelTier.TESTING)
    agents = build_phase3_agents(config)
    assert all(a.model == "gpt-4o-mini" for a in agents.values())
