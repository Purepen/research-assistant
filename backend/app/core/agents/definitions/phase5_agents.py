"""
Phase 5 Agent Definitions

Extracted from: Notebook Cell 20
Purpose: Define professor reviewer agent
"""

from agents import Agent
from app.models.review import OverallReview
from app.core.agents.instructions.phase5_reviewer import PROFESSOR_REVIEWER_INSTRUCTIONS


# Professor Reviewer Agent (Cell 20) gpt 4o
professor_reviewer_agent = Agent(
    name="ProfessorReviewer",
    instructions=PROFESSOR_REVIEWER_INSTRUCTIONS,
    model="gpt-4o-mini",
    output_type=OverallReview
)
