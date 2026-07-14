"""
Phase 1: Paper Abstract Fetcher

Agent that fetches actual paper pages and extracts citation data via web search.
Title/abstract/metric are this agent's self-report — they are NOT independently
checked. The DOI is: build_verified_citation_pool() confirms it against CrossRef
(free, no API key) before a paper is allowed into the pool, and drops any paper
whose DOI doesn't resolve rather than let a possibly-invented DOI reach a
student's submitted document.
"""

from __future__ import annotations

import asyncio
from typing import List, Literal

import httpx
from agents import Agent, WebSearchTool, Runner

from app.models.resources import DiscoveredPaper
from app.models.locked_requirements import VerifiedPaper
from app.core.agents.instructions.phase1_paper_fetcher import PAPER_ABSTRACT_FETCHER_INSTRUCTIONS

_CROSSREF_TIMEOUT = 6.0
# No mailto param: that would move this into CrossRef's "polite pool" (higher rate
# limit) but requires a real, monitored contact address. Add one via CROSSREF_CONTACT_EMAIL
# once the platform has a support inbox — the public pool's limit is well above what a
# single generation (<=10 papers) needs in the meantime.
_CROSSREF_HEADERS = {"User-Agent": "ResearchAssistant/1.0 (github.com/Purepen/research-assistant)"}


# ─── Agent definition ────gpt-40─────────────────────────────────────────────────────

paper_abstract_fetcher_agent = Agent(
    name="PaperAbstractFetcher",
    instructions=PAPER_ABSTRACT_FETCHER_INSTRUCTIONS,
    model="gpt-4o-mini",
    tools=[WebSearchTool()],
    output_type=VerifiedPaper,
)


# ─── CrossRef DOI verification ────────────────────────────────────────────────

async def _crossref_doi_status(doi: str) -> Literal["resolved", "not_found", "unreachable"]:
    """
    Confirm a DOI actually exists via CrossRef (free, no API key required).

    "not_found" is the one outcome the caller must act on — CrossRef explicitly
    saying a DOI doesn't exist is the strongest signal available that the model
    invented it. "unreachable" (timeout, rate limit, 5xx) is a network hiccup,
    not evidence the DOI is fake, so it must not be treated the same way.
    """
    try:
        async with httpx.AsyncClient(timeout=_CROSSREF_TIMEOUT) as client:
            resp = await client.get(
                f"https://api.crossref.org/works/{doi}", headers=_CROSSREF_HEADERS
            )
    except httpx.HTTPError:
        return "unreachable"

    if resp.status_code == 200:
        return "resolved"
    if resp.status_code == 404:
        return "not_found"
    return "unreachable"


# ─── Batch fetcher ────────────────────────────────────────────────────────────

async def build_verified_citation_pool(
    discovered_papers: List[DiscoveredPaper],
    research_topic: str,
    max_papers: int = 10,
) -> List[VerifiedPaper]:
    """
    Fetch each discovered paper via web search, then check any DOI it returns
    against CrossRef before admitting the paper to the pool.

    Title/abstract/metric remain the fetch agent's self-report — CrossRef doesn't
    confirm those. It confirms the DOI exists, which is the field most likely to
    be silently wrong (a plausible-looking invented DOI). Papers whose DOI fails
    resolution are dropped, same as papers the fetch agent errored on.

    Args:
        discovered_papers: List of papers from Phase 1 resource discovery
        research_topic:    Topic string for context
        max_papers:        Cap to avoid runaway API costs (default 10)

    Returns:
        List of VerifiedPaper objects, sorted by is_baseline_candidate desc
    """
    papers_to_fetch = discovered_papers[:max_papers]

    print("\n📚 PAPER ABSTRACT FETCHER")
    print(f"   Fetching {len(papers_to_fetch)} papers for verified citation pool...")
    print("-" * 60)

    verified: List[VerifiedPaper] = []
    failed = 0

    # Run fetches concurrently (max 3 at a time to avoid rate limits)
    semaphore = asyncio.Semaphore(3)

    async def fetch_one(paper: DiscoveredPaper) -> VerifiedPaper | None:
        async with semaphore:
            # Build search query for papers without a clear URL
            search_input = (
                f"Find the abstract and DOI for this paper:\n"
                f"Title: {paper.title}\n"
                f"Authors: {paper.authors}\n"
                f"Year: {paper.year}\n"
                f"Research topic context: {research_topic}\n\n"
                f"Fetch the paper page, extract the abstract, key metric, and DOI. "
                f"Format as a VerifiedPaper object."
            )
            try:
                result = await Runner.run(
                    starting_agent=paper_abstract_fetcher_agent,
                    input=search_input,
                )
                verified_paper: VerifiedPaper = result.final_output
                metric_str = (
                    f"{verified_paper.key_metric}: {verified_paper.key_metric_value}"
                    if verified_paper.key_metric
                    else "no metric"
                )

                if verified_paper.doi:
                    status = await _crossref_doi_status(verified_paper.doi)
                    if status == "not_found":
                        print(f"   ❌ DOI does not resolve on CrossRef — dropping "
                              f"'{verified_paper.title[:50]}' ({verified_paper.doi})")
                        return None
                    verified_paper.doi_verified = (status == "resolved")
                    doi_str = f"{verified_paper.doi} ({status})"
                else:
                    doi_str = "no DOI"

                print(f"   ✅ {verified_paper.authors} ({verified_paper.year}) "
                      f"| {metric_str} | {doi_str}")
                return verified_paper

            except Exception as exc:
                print(f"   ⚠️  Failed to verify '{paper.title[:50]}': {exc}")
                return None

    tasks = [fetch_one(p) for p in papers_to_fetch]
    results = await asyncio.gather(*tasks, return_exceptions=False)

    for r in results:
        if r is not None:
            verified.append(r)
        else:
            failed += 1

    # Sort: baseline candidates first, then by year (newest first)
    verified.sort(key=lambda p: (not p.is_baseline_candidate, -p.year))

    print(f"\n   Citation pool built: {len(verified)} verified, {failed} failed")
    return verified
