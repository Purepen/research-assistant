"""
Phase 6 Workflows

Extracted from: Notebook Cell 22
Purpose: Email notification with formatted specification
"""

from typing import Optional
from agents import Runner, function_tool
from app.models.specification import ProjectSpecification
from app.models.review import OverallReview
from app.core.agents.definitions.phase6_agents import email_agent
import resend
import os


@function_tool
def send_email(to: str, subject: str, html: str) -> dict:
    """
    Send email via Resend API
    
    Args:
        to: Recipient email
        subject: Email subject
        html: HTML email content
        
    Returns:
        Result dict with success status
    """
    try:
        resend.api_key = os.getenv("RESEND_API_KEY")
        
        params = {
            "from": "Research Assistant <noreply@yourdomain.com>",
            "to": [to],
            "subject": subject,
            "html": html,
        }
        
        email_result = resend.Emails.send(params)
        
        return {
            "success": True,
            "message": "Email sent successfully",
            "email_id": email_result.get("id")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def send_specification_email(specification_results: dict) -> Optional[dict]:
    """
    Send final specification via email
    
    Args:
        specification_results: Complete results from review loop
        
    Returns:
        Email send result or None if failed
    """
    
    print("\n📧 PREPARING EMAIL NOTIFICATION")
    print("-" * 80)
    
    spec = specification_results['final_specification']
    review = specification_results['final_review']
    
    # Create email report text
    report_text = f"""
MSC RESEARCH SPECIFICATION - FINAL REPORT

{'=' * 80}
PROJECT INFORMATION
{'=' * 80}

Title: {spec.project_title}
Status: {review.decision}
Total Marks: {review.total_marks}/100
Iterations Completed: {specification_results['iterations_completed']}
Best Iteration: {specification_results['best_iteration_number']}
Total Word Count: {spec.total_word_count}

{'=' * 80}
ABSTRACT ({spec.abstract.word_count} words)
{'=' * 80}

{spec.abstract.content}

{'=' * 80}
JUSTIFICATION AND OVERALL AIM ({spec.justification_and_aim.word_count} words)
{'=' * 80}

{spec.justification_and_aim.content}

{'=' * 80}
OBJECTIVES ({spec.objectives.word_count} words)
{'=' * 80}

{spec.objectives.content}

{'=' * 80}
REVIEW OF LITERATURE ({spec.literature_review.word_count} words)
{'=' * 80}

{spec.literature_review.content}

{'=' * 80}
METHODOLOGY ({spec.methodology.word_count} words)
{'=' * 80}

{spec.methodology.content}

{'=' * 80}
WORK PLAN
{'=' * 80}

{spec.work_plan.content}

{'=' * 80}
REFERENCES ({len(spec.references)} citations)
{'=' * 80}

{chr(10).join(spec.references)}

{'=' * 80}
PROFESSOR REVIEW
{'=' * 80}

Overall Assessment:
{review.supervisor_comments}

Overall Strengths:
{chr(10).join(f"✅ {s}" for s in review.overall_strengths)}

Critical Issues:
{chr(10).join(f"⚠️ {issue}" for issue in review.critical_issues) if review.critical_issues else "None"}

Section Marks:
{chr(10).join(f"- {sr.section_name}: {sr.marks_awarded}/{sr.marks_possible}" for sr in review.section_reviews)}

{'=' * 80}
ITERATION HISTORY
{'=' * 80}

{chr(10).join(f"Iteration {it['iteration']}: {it['marks']}/100 - {it['review'].decision}" for it in specification_results['all_iterations'])}

⭐ Best iteration selected: Iteration {specification_results['best_iteration_number']} ({review.total_marks}/100)
"""
    
    print("   Formatting email...")
    
    try:
        # Add send_email tool to agent
        email_agent_with_tool = email_agent
        email_agent_with_tool.tools = [send_email]
        
        # Send to email agent for formatting and sending
        result = await Runner.run(
            starting_agent=email_agent_with_tool,
            input=report_text
        )
        
        print("✅ Email sent successfully")
        return result
        
    except Exception as e:
        print(f"⚠️ Email failed: {e}")
        import traceback
        traceback.print_exc()
        return None
