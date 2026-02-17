"""
Project Analysis Models

Extracted from: Notebook Cell 3
Purpose: Spec-shaped format for analyzing past projects (makes synthesis easier)
Why: Structures discovered projects in same format as final spec for easy merging
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class ProjectDatasetDetails(BaseModel):
    """Dataset information extracted from a project"""
    name: str = Field(description="Dataset name (e.g., 'CDC BRFSS 2020')")
    source: str = Field(description="Source (Kaggle, UCI, GitHub, Custom, etc.)")
    size: str = Field(description="Dataset size (e.g., '300,000 records', '5KB samples')")
    features: Optional[str] = Field(
        default=None,
        description="Number/description of features if mentioned"
    )
    accessibility: str = Field(
        description="How to access (public/restricted/unavailable)"
    )


class ProjectMethodologyDetails(BaseModel):
    """Methodology information extracted from a project"""
    algorithms_used: List[str] = Field(
        description="List of algorithms/methods used (e.g., ['Random Forest', 'SVM', 'Logistic Regression'])"
    )
    approach_type: str = Field(
        description="Overall approach (e.g., 'Comparative ML', 'Deep Learning', 'Qualitative Analysis')"
    )
    tools_frameworks: List[str] = Field(
        description="Tools/frameworks used (e.g., ['Python', 'scikit-learn', 'TensorFlow'])"
    )
    evaluation_metrics: List[str] = Field(
        description="Metrics used to evaluate (e.g., ['Accuracy', 'F1-Score', 'AUC-ROC'])"
    )
    workflow_summary: str = Field(
        description="Brief summary of their workflow/pipeline"
    )


class AnalyzedProjectSpecSections(BaseModel):
    """
    Project analyzed in SPECIFICATION SECTION FORMAT
    
    This mirrors the structure of a final specification to make synthesis easier.
    Extract from each project dump in this shape so they can be easily merged later.
    """
    
    # Source tracking
    project_source: str = Field(
        description="Source URL or filename"
    )
    project_type: str = Field(
        description="Type: 'MSc thesis', 'BSc project', 'PhD dissertation', 'research paper', 'project report'"
    )
    source_stream: str = Field(
        description="Which stream: 'user_provided' or 'auto_discovered'"
    )
    
    # Core identification
    project_title: str = Field(description="Full project/paper title")
    author_institution: Optional[str] = Field(
        default=None,
        description="Author and/or institution if available"
    )
    year: Optional[int] = Field(
        default=None,
        description="Publication/submission year"
    )
    
    # SPEC-SHAPED SECTIONS (mirrors final specification structure)
    
    abstract_summary: str = Field(
        description="Summary of their abstract/introduction (2-3 sentences)"
    )
    
    problem_justification: str = Field(
        description="What problem they were solving and why it matters (extracted from their introduction/justification)"
    )
    
    objectives_identified: List[str] = Field(
        description="Their stated objectives/research questions"
    )
    
    literature_reviewed: List[str] = Field(
        description="Key papers/sources they cited in literature review (titles or topics)"
    )
    
    methodology_used: ProjectMethodologyDetails = Field(
        description="Detailed methodology they employed"
    )
    
    datasets_used: List[ProjectDatasetDetails] = Field(
        description="Datasets they used (can be empty list if none)"
    )
    
    results_achieved: str = Field(
        description="Summary of their results/findings"
    )
    
    limitations_identified: List[str] = Field(
        description="CRITICAL: Limitations THEY explicitly mentioned (these are GAPS!)"
    )
    
    future_work_suggested: List[str] = Field(
        description="CRITICAL: Future work THEY suggested (these are MORE GAPS!)"
    )
    
    references_cited: List[str] = Field(
        description="Key references they cited (formatted citations if available)"
    )
    
    # Quality metadata
    extraction_confidence: str = Field(
        description="Confidence level: 'high' (full document), 'medium' (partial), 'low' (abstract only)"
    )
    
    notes: Optional[str] = Field(
        default=None,
        description="Any additional notes about this project"
    )
