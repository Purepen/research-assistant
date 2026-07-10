"""
Phase 6 Agent Definitions

Extracted from: Notebook Cell 22
Purpose: Define email agent
"""

from agents import Agent
from app.core.agents.instructions.phase6_email import EMAIL_AGENT_INSTRUCTIONS


# Email Agent (Cell 22) gpt-4o-mini
# Currently unused at runtime: live email delivery goes through
# app/adapters/email_adapter.py (no LLM). Kept because the EMAIL_AGENT key
# is part of the model-tier registry/UI; candidate for removal in 0.8.
email_agent = Agent(
    name="EmailAgent",
    instructions=EMAIL_AGENT_INSTRUCTIONS,
    model="gpt-4o-mini"
)
