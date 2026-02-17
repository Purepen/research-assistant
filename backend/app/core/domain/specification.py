"""
Specification Domain Logic

Purpose: Validation and completeness checks for specifications
Why: Business rules for what makes a valid specification
"""

from typing import List, Dict
from app.models.specification import ProjectSpecification, SpecificationSection
from app.models.guidelines import ProjectGuidelines


def validate_specification(
    spec: ProjectSpecification,
    guidelines: ProjectGuidelines
) -> Dict[str, any]:
    """
    Validate specification against guidelines
    
    Args:
        spec: Generated specification
        guidelines: Project guidelines
        
    Returns:
        Validation result dict with issues
    """
    
    issues = []
    warnings = []
    
    # Check word counts
    for section_req in guidelines.sections:
        section_name_map = {
            "Abstract": spec.abstract,
            "Justification and Overall Aim": spec.justification_and_aim,
            "Objectives": spec.objectives,
            "Review of Literature": spec.literature_review,
            "Methodology": spec.methodology,
            "Work Plan": spec.work_plan
        }
        
        section = section_name_map.get(section_req.section_name)
        if section:
            diff = abs(section.word_count - section_req.word_count)
            
            if diff > 50:
                issues.append(f"{section_req.section_name}: {diff} words off target")
            elif diff > 20:
                warnings.append(f"{section_req.section_name}: {diff} words off target")
    
    # Check total word count
    total_diff = abs(spec.total_word_count - guidelines.target_word_count)
    if total_diff > 100:
        issues.append(f"Total word count: {total_diff} words off target")
    
    # Check references
    if len(spec.references) < 8:
        issues.append(f"Only {len(spec.references)} references (minimum 8)")
    
    # Check all sections have content
    sections = [
        spec.abstract,
        spec.justification_and_aim,
        spec.objectives,
        spec.literature_review,
        spec.methodology,
        spec.work_plan
    ]
    
    for section in sections:
        if not section.content or len(section.content.strip()) < 50:
            issues.append(f"{section.section_name}: Content too short")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "total_issues": len(issues) + len(warnings)
    }


def check_completeness(spec: ProjectSpecification) -> Dict[str, bool]:
    """
    Check if specification is complete
    
    Args:
        spec: Specification to check
        
    Returns:
        Completeness status dict
    """
    
    checks = {
        "has_title": bool(spec.project_title and len(spec.project_title) > 5),
        "has_abstract": bool(spec.abstract.content and spec.abstract.word_count > 100),
        "has_justification": bool(spec.justification_and_aim.content and spec.justification_and_aim.word_count > 100),
        "has_objectives": bool(spec.objectives.content and spec.objectives.word_count > 100),
        "has_literature": bool(spec.literature_review.content and spec.literature_review.word_count > 300),
        "has_methodology": bool(spec.methodology.content and spec.methodology.word_count > 300),
        "has_work_plan": bool(spec.work_plan.content and len(spec.work_plan.content) > 100),
        "has_references": len(spec.references) >= 8,
        "word_count_reasonable": 1500 <= spec.total_word_count <= 5000
    }
    
    checks["complete"] = all(checks.values())
    checks["completeness_percentage"] = int((sum(checks.values()) / len(checks)) * 100)
    
    return checks


def get_section_summary(section: SpecificationSection) -> str:
    """
    Get brief summary of a section
    
    Args:
        section: Specification section
        
    Returns:
        Summary string
    """
    
    return f"{section.section_name}: {section.word_count} words, {len(section.key_points)} key points"


def calculate_readability_score(spec: ProjectSpecification) -> int:
    """
    Simple readability score (0-100)
    
    Args:
        spec: Specification
        
    Returns:
        Score from 0-100
    """
    
    score = 50  # Base score
    
    # Award points for structure
    if spec.abstract.word_count > 200:
        score += 10
    
    if len(spec.references) >= 10:
        score += 10
    
    # Award points for key points
    total_key_points = (
        len(spec.abstract.key_points) +
        len(spec.justification_and_aim.key_points) +
        len(spec.objectives.key_points) +
        len(spec.literature_review.key_points) +
        len(spec.methodology.key_points) +
        len(spec.work_plan.key_points)
    )
    
    if total_key_points >= 20:
        score += 20
    elif total_key_points >= 15:
        score += 10
    
    # Award points for appropriate length
    if 2000 <= spec.total_word_count <= 3500:
        score += 10
    
    return min(100, score)
