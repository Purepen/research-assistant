"""
Phase 0 Workflows

Extracted from: Notebook Cells 4-5
Purpose: Guidelines parsing and topic suggestion workflows
"""

from typing import Optional
from docx import Document
from agents import Runner
from app.models.guidelines import ProjectGuidelines
from app.models.config import SpecificationConfig
from app.core.agents.definitions.phase0_agents import (
    guidelines_parser_agent,
    topic_suggester_agent
)


def extract_text_from_docx(doc: Document) -> str:
    """Extract all text from a DOCX document"""
    text = ""
    for paragraph in doc.paragraphs:
        if paragraph.text:
            text += paragraph.text + "\n"
    return text


async def parse_guidelines(guidelines_doc: Document) -> ProjectGuidelines:
    """
    Parse guidelines document to extract requirements
    
    Args:
        guidelines_doc: DOCX Document object
        
    Returns:
        ProjectGuidelines object with parsed information
    """
    
    print("\n📋 Parsing guidelines document...")
    print("-" * 80)
    
    # Extract text
    guidelines_text = extract_text_from_docx(guidelines_doc)
    
    print(f"   Extracted {len(guidelines_text)} characters")
    
    # Parse with agent
    try:
        result = await Runner.run(
            starting_agent=guidelines_parser_agent,
            input=f"""
Analyze these project specification guidelines and extract all required information:

{guidelines_text}

Parse carefully and infer the project type from the language and requirements.
"""
        )
        
        guidelines = result.final_output
        
        print(f"✅ Guidelines parsed successfully")
        print(f"   Project type: {guidelines.project_type}")
        print(f"   Sections: {len(guidelines.sections)}")
        print(f"   Target word count: {guidelines.target_word_count}")
        print(f"   Timeline: {guidelines.timeline_weeks} weeks")
        print(f"   Citation style: {guidelines.citation_style}")
        print(f"   Requires dataset: {guidelines.requires_dataset}")
        print(f"   Requires methods: {guidelines.requires_methods}")
        print(f"   Requires tools: {guidelines.requires_tools}")
        
        return guidelines
        
    except Exception as e:
        print(f"❌ Error parsing guidelines: {e}")
        import traceback
        traceback.print_exc()
        raise


async def handle_topic(
    field_of_study: str,
    research_topic: Optional[str],
    guidelines: ProjectGuidelines,
    config: SpecificationConfig
) -> str:
    """
    Handle topic - either use provided topic or suggest topics
    
    Args:
        field_of_study: Student's field of study
        research_topic: Provided topic (or None)
        guidelines: Parsed guidelines
        config: System configuration
        
    Returns:
        Selected research topic
    """
    
    if research_topic:
        print(f"\n✅ Using provided topic: {research_topic}")
        return research_topic
    
    # Generate topic suggestions
    print("\n💡 No topic provided - generating suggestions...")
    print("-" * 80)
    
    try:
        result = await Runner.run(
            starting_agent=topic_suggester_agent,
            input=f"""
Generate 5-7 research topic suggestions for:

Field of Study: {field_of_study}
Academic Level: {config.academic_level}
Project Type: {guidelines.project_type}
Timeline: {guidelines.timeline_weeks} weeks
Effort Level: {config.effort_level}

Requirements:
- Dataset required: {guidelines.requires_dataset}
- Methods required: {guidelines.requires_methods}
- Tools required: {guidelines.requires_tools}

Generate topics that are feasible, interesting, and aligned with these constraints.
"""
        )
        
        suggestions = result.final_output
        
        print(f"\n✨ Generated {len(suggestions.suggestions)} topic suggestions:")
        print("=" * 80)
        
        for i, sug in enumerate(suggestions.suggestions, 1):
            print(f"\n{i}. {sug.topic}")
            print(f"   Difficulty: {sug.estimated_difficulty}")
            print(f"   Rationale: {sug.rationale}")
            print(f"   Resources: {sug.available_resources}")
        
        print("\n" + "=" * 80)
        print("⚠️ NOTE: In production, user would select a topic here.")
        print("For now, using the first suggestion.")
        
        # In production, user would select
        # For now, return first suggestion
        selected_topic = suggestions.suggestions[0].topic
        print(f"\n✅ Selected topic: {selected_topic}")
        
        return selected_topic
        
    except Exception as e:
        print(f"❌ Error generating topics: {e}")
        import traceback
        traceback.print_exc()
        raise
