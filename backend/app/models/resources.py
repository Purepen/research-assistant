"""
Resource Discovery Models

Extracted from: Notebook Cell 2
Purpose: Structures for resources discovered via web search (Stream 3 of 3-stream pipeline)
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class DiscoveredDataset(BaseModel):
    name: str
    source: str  # "Kaggle", "UCI", "HuggingFace", "Custom"
    description: str
    size: Optional[str] = None
    access_url: Optional[str] = None


class DiscoveredMethod(BaseModel):
    name: str
    description: str
    complexity: str  # "Simple", "Moderate", "Complex"
    typical_use: str


class DiscoveredTool(BaseModel):
    name: str
    type: str  # "Library", "Framework", "Software"
    language: Optional[str] = None
    description: str


class DiscoveredPaper(BaseModel):
    title: str
    authors: str
    year: str
    key_finding: str
    relevance: str


class DiscoveredResources(BaseModel):
    """Resources discovered via web search"""
    
    datasets: List[DiscoveredDataset] = Field(default=[])
    methods: List[DiscoveredMethod] = Field(default=[])
    tools: List[DiscoveredTool] = Field(default=[])
    papers: List[DiscoveredPaper] = Field(default=[])
    
    search_summary: str = Field(
        description="Summary of what was found"
    )
