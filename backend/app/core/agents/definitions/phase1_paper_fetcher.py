"""
Phase 1: Paper Abstract Fetcher

Agent that fetches actual paper pages and extracts verified citation data.
Replaces search-snippet guesses with DOI-linked, metric-confirmed facts.
"""

from __future__ import annotations

import asyncio
from typing import List

from agents import Agent, WebSearchTool, Runner

from app.models.resources import DiscoveredPaper
from app.models.locked_requirements import VerifiedPaper
from app.core.agents.instructions.phase1_paper_fetcher import PAPER_ABSTRACT_FETCHER_INSTRUCTIONS


# ─── Agent definition ────gpt-40─────────────────────────────────────────────────────

paper_abstract_fetcher_agent = Agent(
    name="PaperAbstractFetcher",
    instructions=PAPER_ABSTRACT_FETCHER_INSTRUCTIONS,
    model="gpt-4o-mini",
    tools=[WebSearchTool()],
    output_type=VerifiedPaper,
)


# ─── Batch fetcher ────────────────────────────────────────────────────────────

async def build_verified_citation_pool(
    discovered_papers: List[DiscoveredPaper],
    research_topic: str,
    max_papers: int = 10,
) -> List[VerifiedPaper]:
    """
    Fetch and verify each discovered paper.
    Returns a citation pool of VerifiedPaper objects with real DOIs and metrics.

    Only papers that can be confirmed (even with a valid harvard_citation attempt)
    enter the pool. Papers that produce errors are skipped with a warning.

    Args:
        discovered_papers: List of papers from Phase 1 resource discovery
        research_topic:    Topic string for context
        max_papers:        Cap to avoid runaway API costs (default 10)

    Returns:
        List of VerifiedPaper objects, sorted by is_baseline_candidate desc
    """
    papers_to_fetch = discovered_papers[:max_papers]

    print(f"\n📚 PAPER ABSTRACT FETCHER")
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
                doi_str = verified_paper.doi or "no DOI"
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
