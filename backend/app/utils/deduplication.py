"""
Deduplication Utilities

Extracted from: Notebook (deduplication logic)
Purpose: Remove duplicate projects between user-provided and auto-discovered
"""

from typing import List
from app.models.projects import AnalyzedProjectSpecSections


def deduplicate_projects(
    user_projects: List[AnalyzedProjectSpecSections],
    auto_projects: List[AnalyzedProjectSpecSections],
    similarity_threshold: float = 0.85
) -> tuple[List[AnalyzedProjectSpecSections], int]:
    """
    Remove auto-discovered projects that are too similar to user-provided ones
    
    Args:
        user_projects: User-provided project analyses
        auto_projects: Auto-discovered project analyses
        similarity_threshold: Title similarity threshold (0-1)
        
    Returns:
        Tuple of (deduplicated_auto_projects, num_removed)
    """
    
    if not user_projects or not auto_projects:
        return auto_projects, 0
    
    # Simple title-based deduplication
    # In production, use more sophisticated similarity (embeddings, fuzzy match, etc.)
    
    user_titles = {p.project_title.lower().strip() for p in user_projects}
    
    deduplicated = []
    removed = 0
    
    for auto_proj in auto_projects:
        auto_title = auto_proj.project_title.lower().strip()
        
        # Check if title matches any user project
        if auto_title not in user_titles:
            deduplicated.append(auto_proj)
        else:
            removed += 1
            print(f"   🗑️ Removed duplicate: {auto_proj.project_title[:60]}")
    
    return deduplicated, removed
