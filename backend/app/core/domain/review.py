"""
Review Domain Logic

Purpose: Scoring logic and pass/fail decisions
Why: Business rules for review evaluation
"""

from typing import Dict, List
from app.models.review import OverallReview, SectionReview


def calculate_pass_fail(review: OverallReview) -> str:
    """
    Calculate pass/fail status from review
    
    Args:
        review: Professor review
        
    Returns:
        Status string: PASS, CONDITIONAL_PASS, or FAIL
    """
    
    if review.total_marks >= 80 and review.decision == "APPROVED":
        return "PASS"
    elif review.total_marks >= 60:
        return "CONDITIONAL_PASS"
    else:
        return "FAIL"


def get_improvement_summary(review: OverallReview) -> Dict[str, any]:
    """
    Get actionable improvement summary from review
    
    Args:
        review: Professor review
        
    Returns:
        Summary dict with priorities
    """
    
    # Find weakest sections
    weak_sections = sorted(
        review.section_reviews,
        key=lambda sr: sr.marks_awarded / sr.marks_possible
    )[:3]
    
    # Extract all recommendations
    all_recommendations = []
    for sr in review.section_reviews:
        all_recommendations.extend(sr.recommendations)
    
    return {
        "status": calculate_pass_fail(review),
        "total_marks": review.total_marks,
        "weakest_sections": [
            {
                "name": sr.section_name,
                "score_percentage": int((sr.marks_awarded / sr.marks_possible) * 100),
                "main_issues": sr.weaknesses[:2]
            }
            for sr in weak_sections
        ],
        "critical_issues_count": len(review.critical_issues),
        "top_3_priorities": review.improvement_priorities[:3],
        "total_recommendations": len(all_recommendations)
    }


def compare_reviews(review1: OverallReview, review2: OverallReview) -> Dict[str, any]:
    """
    Compare two reviews to show improvement/decline
    
    Args:
        review1: Earlier review
        review2: Later review
        
    Returns:
        Comparison dict
    """
    
    marks_change = review2.total_marks - review1.total_marks
    
    # Compare section scores
    section_changes = {}
    for sr1 in review1.section_reviews:
        sr2 = next(
            (sr for sr in review2.section_reviews if sr.section_name == sr1.section_name),
            None
        )
        if sr2:
            section_changes[sr1.section_name] = sr2.marks_awarded - sr1.marks_awarded
    
    return {
        "marks_change": marks_change,
        "improved": marks_change > 0,
        "sections_improved": [k for k, v in section_changes.items() if v > 0],
        "sections_declined": [k for k, v in section_changes.items() if v < 0],
        "sections_unchanged": [k for k, v in section_changes.items() if v == 0],
        "critical_issues_resolved": len(review1.critical_issues) - len(review2.critical_issues)
    }


def format_review_summary(review: OverallReview) -> str:
    """
    Format review into readable summary
    
    Args:
        review: Professor review
        
    Returns:
        Formatted string
    """
    
    summary = f"""
REVIEW SUMMARY
{'=' * 60}

OVERALL MARKS: {review.total_marks}/100
DECISION: {review.decision}
STATUS: {calculate_pass_fail(review)}

SECTION BREAKDOWN:
{chr(10).join(f"  {sr.section_name}: {sr.marks_awarded}/{sr.marks_possible}" for sr in review.section_reviews)}

STRENGTHS ({len(review.overall_strengths)}):
{chr(10).join(f"  ✓ {s}" for s in review.overall_strengths)}

CRITICAL ISSUES ({len(review.critical_issues)}):
{chr(10).join(f"  ✗ {issue}" for issue in review.critical_issues) if review.critical_issues else "  None"}

TOP PRIORITIES:
{chr(10).join(f"  {i+1}. {p}" for i, p in enumerate(review.improvement_priorities[:5]))}

SUPERVISOR COMMENTS:
{review.supervisor_comments}
"""
    
    return summary


def is_ready_for_submission(review: OverallReview) -> bool:
    """
    Check if specification is ready for submission
    
    Args:
        review: Professor review
        
    Returns:
        True if ready, False otherwise
    """
    
    return (
        review.decision == "APPROVED" and
        review.total_marks >= 80 and
        len(review.critical_issues) == 0
    )


def get_revision_priority(section_review: SectionReview) -> str:
    """
    Get revision priority for a section
    
    Args:
        section_review: Section review
        
    Returns:
        Priority: HIGH, MEDIUM, LOW
    """
    
    score_percentage = (section_review.marks_awarded / section_review.marks_possible) * 100
    
    if score_percentage < 60:
        return "HIGH"
    elif score_percentage < 75:
        return "MEDIUM"
    else:
        return "LOW"
