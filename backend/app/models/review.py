"""
Review Models

Extracted from: Notebook Cell 2
Purpose: Professor's review and scoring structures
Why: Drives iterative improvement loop (score → revise → re-score)
"""

from pydantic import BaseModel
from typing import List


class SectionReview(BaseModel):
    section_name: str
    marks_awarded: int
    marks_possible: int
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]


class OverallReview(BaseModel):
    """Professor's review of specification"""
    
    section_reviews: List[SectionReview]
    total_marks: int
    overall_strengths: List[str]
    critical_issues: List[str]
    improvement_priorities: List[str]
    decision: str  # "APPROVED", "REVISIONS REQUIRED", "MAJOR REVISIONS"
    supervisor_comments: str
