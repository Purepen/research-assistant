"""
Strategic Synthesis Models

Extracted from: Notebook Cell 2
Purpose: Structures for strategic positioning and differentiation analysis
Why: Ensures project is novel/differentiated, not just copying existing work
"""

from pydantic import BaseModel, Field
from typing import List


class ProjectGap(BaseModel):
    gap_description: str = Field(description="Description of identified gap")
    opportunity: str = Field(description="Opportunity this gap presents")


class StrategicDifferentiationPoint(BaseModel):
    aspect: str = Field(description="Aspect to differentiate on")
    implementation: str = Field(description="How to implement this differentiation")


class NovelContributionClaim(BaseModel):
    claim: str = Field(description="What is novel about this work")
    justification: str = Field(description="Why this is considered novel")


class StrategicSynthesis(BaseModel):
    """Strategic positioning for the research"""
    
    positioning_statement: str = Field(
        description="Overall strategic positioning (2-3 sentences)"
    )
    
    differentiation_strategy: List[StrategicDifferentiationPoint] = Field(
        description="How this project differs from existing work"
    )
    
    novel_contributions: List[NovelContributionClaim] = Field(
        description="Novel contributions this project will make"
    )
    
    performance_targets: str = Field(
        description="Realistic performance/outcome targets"
    )
    
    risk_factors: List[str] = Field(
        description="Potential risks and challenges"
    )
    
    mitigation_strategies: List[str] = Field(
        description="How to mitigate identified risks"
    )
