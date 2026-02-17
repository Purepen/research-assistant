"""
Specification Models

Extracted from: Notebook Cell 2
Purpose: The core deliverable - structure of the final research specification
Why: This IS the product - the complete research specification document
"""

from pydantic import BaseModel, Field
from typing import List


class SpecificationSection(BaseModel):
    section_name: str = Field(description="Name of the section")
    content: str = Field(description="Full content of the section")
    word_count: int = Field(description="Actual word count")
    key_points: List[str] = Field(description="3-5 key points covered")


class ProjectSpecification(BaseModel):
    """Complete project specification"""
    
    project_title: str = Field(description="Project title - EXACT topic provided")
    
    abstract: SpecificationSection = Field(
        description="Abstract section"
    )
    
    justification_and_aim: SpecificationSection = Field(
        description="Justification and Overall Aim section"
    )
    
    objectives: SpecificationSection = Field(
        description="Objectives section"
    )
    
    literature_review: SpecificationSection = Field(
        description="Review of Literature section"
    )
    
    methodology: SpecificationSection = Field(
        description="Methodology section"
    )
    
    work_plan: SpecificationSection = Field(
        description="Work Plan section with timeline"
    )
    
    references: List[str] = Field(
        description="List of references in required citation style"
    )
    
    total_word_count: int = Field(
        description="Total word count of specification"
    )
