"""Regression tests for the 2026-07-14 integrity fixes.

Covers:
  - CrossRef DOI verification: papers with a DOI that doesn't resolve are
    dropped from the citation pool; unreachable/timeout is not treated as fake;
    doi_verified is set honestly.
  - Ethics/positionality statements are no longer injected verbatim into the
    methodology prompt — they're framed as facts for original prose, and the
    validator's signal words still appear so validation doesn't regress.
"""

import httpx
import pytest

import app.core.agents.definitions.phase1_paper_fetcher as fetcher_module
from app.core.agents.definitions.phase1_paper_fetcher import (
    _crossref_doi_status,
    build_verified_citation_pool,
)
from app.core.pipelines.locked_requirements_builder import (
    _build_ethics_statement,
    _build_positionality,
)
from app.core.pipelines.phase3_workflow import _methodology_context
from app.models.locked_requirements import VerifiedPaper
from app.models.resources import DiscoveredPaper
from tests.test_locked_requirements import _guidelines
from tests.test_cost_controls import _locked


# ─── CrossRef status classification ───────────────────────────────────────────

class _Resp:
    def __init__(self, status_code):
        self.status_code = status_code


@pytest.mark.asyncio
async def test_crossref_resolved(monkeypatch):
    async def fake_get(self, url, headers=None):
        return _Resp(200)
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    assert await _crossref_doi_status("10.1000/real") == "resolved"


@pytest.mark.asyncio
async def test_crossref_not_found(monkeypatch):
    async def fake_get(self, url, headers=None):
        return _Resp(404)
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    assert await _crossref_doi_status("10.1000/invented") == "not_found"


@pytest.mark.asyncio
async def test_crossref_unreachable_on_network_error(monkeypatch):
    async def fake_get(self, url, headers=None):
        raise httpx.ConnectTimeout("timed out")
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    assert await _crossref_doi_status("10.1000/x") == "unreachable"


@pytest.mark.asyncio
async def test_crossref_unreachable_on_5xx(monkeypatch):
    async def fake_get(self, url, headers=None):
        return _Resp(503)
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    assert await _crossref_doi_status("10.1000/x") == "unreachable"


# ─── build_verified_citation_pool behavior ────────────────────────────────────

def _discovered(n: int = 1) -> list:
    return [
        DiscoveredPaper(
            title=f"Paper {i}", authors="Author, A.", year="2020",
            key_finding="finding", relevance="relevant",
        )
        for i in range(n)
    ]


def _fake_paper(doi):
    return VerifiedPaper(
        title="Some paper", authors="Author, A.", year=2020, doi=doi,
        source_url="https://example.org/p", abstract_snippet="...",
        harvard_citation="Author, A. (2020) ...",
    )


class _FakeRunResult:
    def __init__(self, output):
        self.final_output = output


@pytest.mark.asyncio
async def test_dead_doi_is_dropped_from_pool(monkeypatch):
    async def fake_run(*, starting_agent, input):
        return _FakeRunResult(_fake_paper(doi="10.1000/fake"))
    monkeypatch.setattr(fetcher_module.Runner, "run", fake_run)
    monkeypatch.setattr(fetcher_module, "_crossref_doi_status", lambda doi: _async_const("not_found"))
    pool = await build_verified_citation_pool(_discovered(1), "topic")
    assert pool == []


@pytest.mark.asyncio
async def test_resolved_doi_is_marked_verified(monkeypatch):
    async def fake_run(*, starting_agent, input):
        return _FakeRunResult(_fake_paper(doi="10.1000/real"))
    monkeypatch.setattr(fetcher_module.Runner, "run", fake_run)
    monkeypatch.setattr(fetcher_module, "_crossref_doi_status", lambda doi: _async_const("resolved"))
    pool = await build_verified_citation_pool(_discovered(1), "topic")
    assert len(pool) == 1
    assert pool[0].doi_verified is True


@pytest.mark.asyncio
async def test_unreachable_crossref_keeps_paper_unverified(monkeypatch):
    """A network hiccup must not delete a paper — that would punish the student
    for CrossRef being down, and it isn't evidence the DOI is fake."""
    async def fake_run(*, starting_agent, input):
        return _FakeRunResult(_fake_paper(doi="10.1000/real"))
    monkeypatch.setattr(fetcher_module.Runner, "run", fake_run)
    monkeypatch.setattr(fetcher_module, "_crossref_doi_status", lambda doi: _async_const("unreachable"))
    pool = await build_verified_citation_pool(_discovered(1), "topic")
    assert len(pool) == 1
    assert pool[0].doi_verified is False


@pytest.mark.asyncio
async def test_doi_less_paper_is_kept_and_unverified(monkeypatch):
    async def fake_run(*, starting_agent, input):
        return _FakeRunResult(_fake_paper(doi=None))
    monkeypatch.setattr(fetcher_module.Runner, "run", fake_run)
    pool = await build_verified_citation_pool(_discovered(1), "topic")
    assert len(pool) == 1
    assert pool[0].doi_verified is False


async def _async_const(value):
    return value


# ─── Ethics/positionality: facts in, original prose expected out ─────────────

def test_ethics_statement_is_a_brief_not_a_paragraph():
    """The brief should be short guidance, not the multi-sentence template that
    used to be pasted verbatim into every project's methodology section."""
    ethics = _build_ethics_statement("public", "UCI Heart Disease", "Computer Science")
    assert ethics.irb_required is False
    assert len(ethics.statement.split()) < 60  # a brief, not a full paragraph


def test_two_projects_same_sensitivity_get_identical_facts_but_prompt_demands_originality():
    """The underlying compliance facts are correctly deterministic (same
    data_sensitivity -> same irb_required) — that's intentional, not a bug.
    What must differ is the prompt instructing original prose per project."""
    a = _build_ethics_statement("public", "Dataset A", "Computer Science")
    b = _build_ethics_statement("public", "Dataset B", "Economics")
    assert a.irb_required == b.irb_required == False
    ctx_a = _methodology_context(_locked(), _guidelines())
    assert "ETHICS CONTEXT" in ctx_a
    assert "ORIGINAL prose" in ctx_a
    assert "DROP THIS IN" not in ctx_a


def test_methodology_prompt_still_carries_ethics_signal_words():
    """Regression guard: spec_validator's ethics_signals checklist scans the
    written methodology text for words like 'ethic'/'consent'/'irb'. The prompt
    must still surface these so the writer's original prose can satisfy it."""
    ctx = _methodology_context(_locked(), _guidelines())
    low = ctx.lower()
    assert "ethic" in low
    assert "approval" in low


def test_positionality_is_guidance_not_finished_prose():
    guidance = _build_positionality("English Literature", "Postcolonial identity in Achebe", None)
    assert "original" in guidance.lower()
    assert "Postcolonial identity in Achebe" in guidance
    # The old template's fixed opening must not appear verbatim
    assert "As a researcher approaching" not in guidance
