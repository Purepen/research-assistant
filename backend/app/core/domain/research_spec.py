"""
Research Specification Domain Model

This module defines the core business concept of a Research Specification.
Pure domain logic - no AI, no database, no external dependencies.

A Research Specification contains:
- Project metadata (title, field, level)
- Content sections (abstract, justification, objectives, etc.)
- Validation rules
- Business constraints
"""
from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class SpecificationSection(BaseModel):
    """
    A single section of the specification (e.g., Abstract, Methodology)
    
    Business Rules:
    - Each section has content and word count
    - Word count must match actual content
    - Content cannot be empty for required sections
    """
    section_name: str = Field(description="Name of the section (e.g., 'Abstract')")
    content: str = Field(description="The actual text content")
    word_count: int = Field(ge=0, description="Number of words in content")
    is_required: bool = Field(default=True, description="Whether this section is mandatory")
    min_words: Optional[int] = Field(default=None, description="Minimum word count requirement")
    max_words: Optional[int] = Field(default=None, description="Maximum word count requirement")
    
    @field_validator('word_count')
    @classmethod
    def validate_word_count(cls, v: int, info) -> int:
        """Ensure word count matches actual content"""
        if 'content' in info.data:
            actual_count = len(info.data['content'].split())
            if abs(actual_count - v) > 5:  # Allow small variance
                return actual_count
        return v
    
    def is_valid_length(self) -> bool:
        """Check if content meets length requirements"""
        if self.min_words and self.word_count < self.min_words:
            return False
        if self.max_words and self.word_count > self.max_words:
            return False
        return True
    
    def length_status(self) -> str:
        """Get human-readable length status"""
        if not self.min_words and not self.max_words:
            return "No constraints"
        
        if self.min_words and self.word_count < self.min_words:
            return f"Too short (need {self.min_words - self.word_count} more words)"
        
        if self.max_words and self.word_count > self.max_words:
            return f"Too long (reduce by {self.word_count - self.max_words} words)"
        
        return "Within limits"


class ResearchSpecification(BaseModel):
    """
    Complete Research Specification Document
    
    This is the CORE business entity - represents a complete research proposal.
    
    Business Rules:
    - Must have a title
    - Academic level determines expectations (BSc < MSc < PhD)
    - Total word count is sum of all sections
    - All required sections must be present
    - References must be in Harvard format
    """
    
    # Metadata
    project_title: str = Field(description="Title of the research project")
    field_of_study: str = Field(description="Academic field (e.g., 'Computer Science - ML')")
    academic_level: Literal["BSc", "MSc", "PhD"] = Field(description="Academic level")
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Content Sections
    abstract: SpecificationSection = Field(description="Abstract section")
    justification_and_aim: SpecificationSection = Field(description="Justification and aims")
    objectives: SpecificationSection = Field(description="Research objectives")
    literature_review: SpecificationSection = Field(description="Literature review")
    methodology: SpecificationSection = Field(description="Methodology section")
    work_plan: SpecificationSection = Field(description="Work plan/timeline")
    
    # References
    references: List[str] = Field(
        default_factory=list,
        description="List of references in Harvard format"
    )
    
    # Computed fields
    total_word_count: int = Field(
        default=0,
        description="Total words across all sections"
    )
    
    def __init__(self, **data):
        """Initialize and compute total word count"""
        super().__init__(**data)
        self.total_word_count = self.calculate_total_words()
    
    def calculate_total_words(self) -> int:
        """Calculate total word count across all sections"""
        return (
            self.abstract.word_count +
            self.justification_and_aim.word_count +
            self.objectives.word_count +
            self.literature_review.word_count +
            self.methodology.word_count +
            self.work_plan.word_count
        )
    
    def get_all_sections(self) -> List[SpecificationSection]:
        """Get list of all content sections"""
        return [
            self.abstract,
            self.justification_and_aim,
            self.objectives,
            self.literature_review,
            self.methodology,
            self.work_plan
        ]
    
    def validate_completeness(self) -> tuple[bool, List[str]]:
        """
        Check if specification is complete
        
        Returns:
            (is_complete, list_of_issues)
        """
        issues = []
        
        # Check each section
        for section in self.get_all_sections():
            if section.is_required and not section.content.strip():
                issues.append(f"{section.section_name} is empty")
            
            if not section.is_valid_length():
                issues.append(f"{section.section_name}: {section.length_status()}")
        
        # Check references
        if len(self.references) < 5:
            issues.append(f"Too few references (need at least 5, have {len(self.references)})")
        
        return (len(issues) == 0, issues)
    
    def get_word_count_by_section(self) -> dict[str, int]:
        """Get word count breakdown by section"""
        return {
            "Abstract": self.abstract.word_count,
            "Justification & Aim": self.justification_and_aim.word_count,
            "Objectives": self.objectives.word_count,
            "Literature Review": self.literature_review.word_count,
            "Methodology": self.methodology.word_count,
            "Work Plan": self.work_plan.word_count,
            "Total": self.total_word_count
        }
    
    def to_markdown(self) -> str:
        """Convert specification to markdown format"""
        md = f"""# {self.project_title}

**Field:** {self.field_of_study}  
**Level:** {self.academic_level}  
**Date:** {self.created_at.strftime('%Y-%m-%d')}

---

## Abstract
{self.abstract.content}

---

## Justification and Overall Aim
{self.justification_and_aim.content}

---

## Objectives
{self.objectives.content}

---

## Review of Literature
{self.literature_review.content}

---

## Methodology
{self.methodology.content}

---

## Work Plan
{self.work_plan.content}

---

## References
"""
        for i, ref in enumerate(self.references, 1):
            md += f"{i}. {ref}\n"
        
        return md
    
    def get_expected_quality(self) -> str:
        """Get expected quality level based on academic level"""
        quality_map = {
            "BSc": "Demonstrates understanding of fundamental concepts and basic research methods",
            "MSc": "Shows critical analysis, synthesis of multiple sources, and methodological rigor",
            "PhD": "Exhibits original thinking, comprehensive literature mastery, and novel contributions"
        }
        return quality_map[self.academic_level]


class SpecificationMetrics(BaseModel):
    """
    Metrics and analytics for a specification
    
    Business intelligence about the specification quality
    """
    total_words: int
    section_count: int
    reference_count: int
    average_section_length: float
    completeness_score: float = Field(ge=0, le=1, description="0-1 score for completeness")
    
    # Quality indicators
    has_sufficient_references: bool
    all_sections_complete: bool
    meets_word_requirements: bool
    
    @classmethod
    def from_specification(cls, spec: ResearchSpecification) -> "SpecificationMetrics":
        """Generate metrics from a specification"""
        is_complete, issues = spec.validate_completeness()
        sections = spec.get_all_sections()
        
        return cls(
            total_words=spec.total_word_count,
            section_count=len(sections),
            reference_count=len(spec.references),
            average_section_length=spec.total_word_count / len(sections) if sections else 0,
            completeness_score=1.0 if is_complete else max(0, 1 - (len(issues) * 0.1)),
            has_sufficient_references=len(spec.references) >= 5,
            all_sections_complete=all(s.content.strip() for s in sections if s.is_required),
            meets_word_requirements=all(s.is_valid_length() for s in sections)
        )


# Business rules and constraints
SECTION_REQUIREMENTS = {
    "BSc": {
        "abstract": {"min_words": 100, "max_words": 300},
        "justification_and_aim": {"min_words": 200, "max_words": 500},
        "objectives": {"min_words": 100, "max_words": 300},
        "literature_review": {"min_words": 300, "max_words": 800},
        "methodology": {"min_words": 300, "max_words": 800},
        "work_plan": {"min_words": 100, "max_words": 300},
        "min_references": 5
    },
    "MSc": {
        "abstract": {"min_words": 150, "max_words": 350},
        "justification_and_aim": {"min_words": 300, "max_words": 700},
        "objectives": {"min_words": 150, "max_words": 400},
        "literature_review": {"min_words": 500, "max_words": 1200},
        "methodology": {"min_words": 500, "max_words": 1200},
        "work_plan": {"min_words": 150, "max_words": 400},
        "min_references": 10
    },
    "PhD": {
        "abstract": {"min_words": 200, "max_words": 400},
        "justification_and_aim": {"min_words": 500, "max_words": 1000},
        "objectives": {"min_words": 200, "max_words": 500},
        "literature_review": {"min_words": 800, "max_words": 2000},
        "methodology": {"min_words": 800, "max_words": 2000},
        "work_plan": {"min_words": 200, "max_words": 500},
        "min_references": 20
    }
}


def create_empty_specification(
    title: str,
    field: str,
    level: Literal["BSc", "MSc", "PhD"]
) -> ResearchSpecification:
    """
    Factory function to create an empty specification with proper constraints
    
    Business Rule: Constraints are set based on academic level
    """
    reqs = SECTION_REQUIREMENTS[level]
    
    return ResearchSpecification(
        project_title=title,
        field_of_study=field,
        academic_level=level,
        abstract=SpecificationSection(
            section_name="Abstract",
            content="",
            word_count=0,
            is_required=True,
            **reqs["abstract"]
        ),
        justification_and_aim=SpecificationSection(
            section_name="Justification and Overall Aim",
            content="",
            word_count=0,
            is_required=True,
            **reqs["justification_and_aim"]
        ),
        objectives=SpecificationSection(
            section_name="Objectives",
            content="",
            word_count=0,
            is_required=True,
            **reqs["objectives"]
        ),
        literature_review=SpecificationSection(
            section_name="Review of Literature",
            content="",
            word_count=0,
            is_required=True,
            **reqs["literature_review"]
        ),
        methodology=SpecificationSection(
            section_name="Methodology",
            content="",
            word_count=0,
            is_required=True,
            **reqs["methodology"]
        ),
        work_plan=SpecificationSection(
            section_name="Work Plan",
            content="",
            word_count=0,
            is_required=True,
            **reqs["work_plan"]
        ),
        references=[]
    )
