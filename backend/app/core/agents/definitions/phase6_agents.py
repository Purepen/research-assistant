"""
Phase 6 Agent Definitions

Extracted from: Notebook Cell 22
Purpose: Define email agent
"""

from agents import Agent
from app.core.agents.instructions.phase6_email import EMAIL_AGENT_INSTRUCTIONS


# Email Agent (Cell 22) gpt-4o-mini
# Note: send_email tool defined in phase6_workflow
email_agent = Agent(
    name="EmailAgent",
    instructions=EMAIL_AGENT_INSTRUCTIONS,
    model="gpt-4o-mini"
    # tools=[send_email] added dynamically in workflow
)
