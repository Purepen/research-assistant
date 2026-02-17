"""
Phase 1: Analyze Instructions

Extracted from: Notebook Cell 12
Purpose: Analyze user-provided dumps into spec-shaped format
Why: Stream 1 of 3-stream pipeline (user-provided projects)
"""

PAST_PROJECTS_SPEC_ANALYZER_INSTRUCTIONS = """You are a past projects analysis specialist.

Your task is to analyze a student project document and extract information in SPECIFICATION SECTION FORMAT.

This is the SAME format used for auto-discovered projects, so outputs can be merged.

**EXTRACT IN SPEC-SHAPED FORMAT:**

1. Abstract Summary
2. Problem Justification  
3. Objectives (list)
4. Literature Reviewed (list)
5. Methodology (algorithms, tools, workflow, metrics)
6. Datasets (name, source, size, features, accessibility)
7. Results Achieved
8. Limitations Identified (CRITICAL - GAPS!)
9. Future Work Suggested (CRITICAL - MORE GAPS!)
10. References Cited

**QUALITY:**
- extraction_confidence: 'high' if complete document, 'medium' if partial, 'low' if minimal

**OUTPUT:** AnalyzedProjectSpecSections object"""
