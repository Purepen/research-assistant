"""
Guidelines Models

Extracted from: Notebook Cell 2
Purpose: Structures for parsed institutional guidelines from .docx files
"""

from pydantic import BaseModel, Field
from typing import List


class SectionRequirement(BaseModel):
    """Individual section requirement"""
    section_name: str = Field(description="Name of the section")
    word_count: int = Field(description="Required word count for this section")


class ProjectGuidelines(BaseModel):
    """Parsed guidelines from student's institution"""
    
    # Required structure - CHANGED FROM DICT TO LIST
    sections: List[SectionRequirement] = Field(
        description="List of required sections with word counts"
    )
    
    citation_style: str = Field(
        description="Required citation style (e.g., 'Harvard', 'APA', 'IEEE')"
    )
    
    timeline_weeks: int = Field(
        description="Project completion timeline in weeks"
    )
    
    target_word_count: int = Field(
        description="Total target word count"
    )
    
    # Inferred project characteristics
    project_type: str = Field(
        description="Inferred project type: 'quantitative_ml', 'qualitative', 'theory', 'experimental', 'engineering', 'mixed'"
    )
    
    requires_dataset: bool = Field(
        description="Whether project requires dataset(s)"
    )
    
    requires_methods: bool = Field(
        description="Whether project requires specific methods/algorithms"
    )
    
    requires_tools: bool = Field(
        description="Whether project requires specific tools/software"
    )
    
    additional_requirements: List[str] = Field(
        default=[],
        description="Any other specific requirements from guidelines"
    )
