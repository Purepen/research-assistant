"""
Phase 5 Workflows

Extracted from: Notebook Cell 20-21
Purpose: Professor review loop with iteration tracking
"""

from typing import Optional
from agents import Runner
from app.models.specification import ProjectSpecification
from app.models.review import OverallReview
from app.models.guidelines import ProjectGuidelines
from app.models.synthesis import StrategicSynthesis
from app.models.resources import DiscoveredResources
from app.models.config import SpecificationConfig
from app.core.agents.definitions.phase5_agents import professor_reviewer_agent
from app.core.pipelines.phase4_workflow import (
    generate_specification,
    create_context_for_agents
)


def format_specification_for_review(spec: ProjectSpecification) -> str:
    """Format specification for professor review"""
    
    return f"""
PROJECT TITLE:
{spec.project_title}

ABSTRACT ({spec.abstract.word_count} words):
{spec.abstract.content}

JUSTIFICATION AND OVERALL AIM ({spec.justification_and_aim.word_count} words):
{spec.justification_and_aim.content}

OBJECTIVES ({spec.objectives.word_count} words):
{spec.objectives.content}

REVIEW OF LITERATURE ({spec.literature_review.word_count} words):
{spec.literature_review.content}

METHODOLOGY ({spec.methodology.word_count} words):
{spec.methodology.content}

WORK PLAN:
{spec.work_plan.content}

REFERENCES ({len(spec.references)} citations):
{chr(10).join(spec.references)}

TOTAL WORD COUNT: {spec.total_word_count}
"""


async def review_specification(
    specification: ProjectSpecification,
    guidelines: ProjectGuidelines,
    iteration: int,
    iteration_history: list = None
) -> OverallReview:
    """
    Review specification with professor agent
    
    Args:
        specification: Complete specification
        guidelines: Project guidelines
        iteration: Current iteration number
        iteration_history: Previous iterations
        
    Returns:
        OverallReview with marks and feedback
    """
    
    print(f"\n👨‍🏫 PROFESSOR REVIEW (Iteration {iteration})")
    print("-" * 80)
    
    # Format specification
    spec_text = format_specification_for_review(specification)
    
    # Prepare review context
    review_input = f"""
ITERATION: {iteration}

{spec_text}

GUIDELINES:
- Project Type: {guidelines.project_type}
- Timeline: {guidelines.timeline_weeks} weeks
- Target Word Count: {guidelines.target_word_count}
- Required Sections: {', '.join(s.section_name for s in guidelines.sections)}
"""
    
    # Add iteration history if available
    if iteration_history and len(iteration_history) > 0:
        review_input += f"""

ITERATION HISTORY:
{chr(10).join(f"Iteration {it['iteration']}: {it['marks']}/100 - {it['review'].decision}" for it in iteration_history)}
"""
    
    # Get professor review
    try:
        result = await Runner.run(
            starting_agent=professor_reviewer_agent,
            input=review_input
        )
        
        review = result.final_output
        
        print(f"   ✅ Review complete")
        print(f"   Marks: {review.total_marks}/100")
        print(f"   Decision: {review.decision}")
        
        return review
        
    except Exception as e:
        print(f"   ❌ Review failed: {e}")
        raise


async def run_specification_with_review_loop(
    research_topic: str,
    strategic_synthesis: StrategicSynthesis,
    discovered_resources: DiscoveredResources,
    guidelines: ProjectGuidelines,
    feasibility_calibration: Optional[any],
    config: SpecificationConfig,
    max_iterations: int = 3
) -> dict:
    """
    Generate specification with iterative professor review
    Tracks ALL iterations and returns the BEST one (highest marks)
    
    Returns:
        dict with final_specification, final_review, all_iterations, best_iteration_number
    """
    
    print("\n" + "=" * 80)
    print("SPECIFICATION GENERATION WITH REVIEW LOOP")
    print("=" * 80)
    
    # Track ALL iterations
    all_iterations = []
    current_specification = None
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        
        print(f"\n{'=' * 80}")
        print(f"ITERATION {iteration}/{max_iterations}")
        print(f"{'=' * 80}")
        
        # Generate or revise specification
        print(f"\n📝 {'Generating' if iteration == 1 else 'Revising'} specification...")
        
        try:
            if iteration == 1:
                # First iteration: generate from scratch
                current_specification = await generate_specification(
                    research_topic=research_topic,
                    guidelines=guidelines,
                    strategic_synthesis=strategic_synthesis,
                    discovered_resources=discovered_resources,
                    feasibility_calibration=feasibility_calibration
                )
            else:
                # Subsequent iterations: revise based on feedback
                previous_review = all_iterations[-1]['review']
                
                feedback = f"""
PREVIOUS REVIEW:
Marks: {previous_review.total_marks}/100
Decision: {previous_review.decision}

CRITICAL ISSUES:
{chr(10).join(f"- {issue}" for issue in previous_review.critical_issues)}

IMPROVEMENT PRIORITIES:
{chr(10).join(f"{i+1}. {p}" for i, p in enumerate(previous_review.improvement_priorities))}
"""
                
                current_specification = await generate_specification(
                    research_topic=research_topic,
                    guidelines=guidelines,
                    strategic_synthesis=strategic_synthesis,
                    discovered_resources=discovered_resources,
                    feasibility_calibration=feasibility_calibration,
                    previous_feedback=feedback
                )
        
        except Exception as e:
            print(f"❌ Generation failed: {e}")
            raise
        
        # Review specification
        review = await review_specification(
            specification=current_specification,
            guidelines=guidelines,
            iteration=iteration,
            iteration_history=all_iterations
        )
        
        # Record iteration
        all_iterations.append({
            'iteration': iteration,
            'specification': current_specification,
            'review': review,
            'marks': review.total_marks
        })
        
        print(f"\n📊 Iteration {iteration} Results:")
        print(f"   Marks: {review.total_marks}/100")
        print(f"   Decision: {review.decision}")
        
        # Check if approved
        if review.decision == "APPROVED":
            print(f"\n✅ APPROVED on iteration {iteration}!")
            break
        
        if iteration == max_iterations:
            print(f"\n⚠️ Max iterations reached ({max_iterations})")
    
    # Select best iteration (highest marks)
    best_iteration = max(all_iterations, key=lambda x: x['marks'])
    
    print(f"\n{'=' * 80}")
    print(f"REVIEW LOOP COMPLETE")
    print(f"{'=' * 80}")
    print(f"Best iteration: {best_iteration['iteration']} ({best_iteration['marks']}/100)")
    
    return {
        'final_specification': best_iteration['specification'],
        'final_review': best_iteration['review'],
        'all_iterations': all_iterations,
        'best_iteration_number': best_iteration['iteration'],
        'iterations_completed': iteration
    }
