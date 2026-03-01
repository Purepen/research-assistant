"""
Phase 0 Topic Discovery Workflow
=================================
File: backend/app/core/pipelines/phase0_topic_discovery_workflow.py

Follows the exact same pattern as phase0_workflow.py, phase1_workflow.py, etc.
Uses Runner.run() with agent definitions — no direct OpenAI client calls.

Pipeline functions:
    run_topic_discovery()   — Stage 1: form → TopicDiscoveryOutput
    run_topic_advisor()     — Stages 2-4: conversational feasibility chat
    parse_final_topic()     — Utility: extract structured data from final agent output
"""

from __future__ import annotations

import re
from typing import List, Optional, Literal

from agents import Runner

from app.models.topic_discovery import (
    TopicDiscoveryOutput,
    TopicAdvisorOutput,
    FinalTopicOutput,
)
from app.core.agents.definitions.phase0_agents import (
    topic_discovery_agent,
    topic_advisor_explain_agent,
    topic_advisor_questions_agent,
    topic_advisor_feasibility_agent,
    topic_advisor_final_agent,
)


# ══════════════════════════════════════════════════════════════════════════════
# Stage 1 — Topic Discovery
# ══════════════════════════════════════════════════════════════════════════════

async def run_topic_discovery(
    degree_level:       str,
    field:              str,
    project_type:       str,
    preferred_activity: List[str],
    interest_areas:     List[str],
    geographic_focus:   str,
    ambition_level:     str,
    confidence_level:   str,
) -> TopicDiscoveryOutput:
    """
    Stage 1 of the Topic Discovery Engine.
    Takes the 8-question student profile form and returns 12 ranked topic
    suggestions grouped into 3-4 thematic clusters.

    Called by: POST /topics/discover
    """

    print(f"\n💡 TOPIC DISCOVERY — Stage 1")
    print(f"   Field: {field}")
    print(f"   Level: {degree_level} | Ambition: {ambition_level} | Confidence: {confidence_level}")
    print("-" * 80)

    ambition_map = {
        "manageable":  "Wants a safe, achievable project with good pass/merit probability",
        "impressive":  "Wants to stand out — solid novel angle, well executed",
        "distinction": "Targeting distinction/first-class — ambitious scope, clear innovation",
        "cv-strong":   "Career-focused — wants industry-relevant, portfolio-ready work",
    }
    confidence_map = {
        "very-confused":   "Student has no idea where to start",
        "somewhat-unsure": "Student has a general area but no clear topic",
        "rough-direction": "Student has a direction but needs narrowing",
        "have-idea":       "Student has a rough idea and wants validation/refinement",
    }

    result = await Runner.run(
        starting_agent=topic_discovery_agent,
        input=f"""
STUDENT PROFILE:
- Degree Level: {degree_level}
- Field / Department: {field}
- Project Type Required: {project_type.replace('-', ' ').title()}
- Preferred Activities: {', '.join(preferred_activity) or 'Not specified'}
- Interest Areas: {', '.join(interest_areas) or 'Not specified'}
- Geographic Focus: {geographic_focus.title()}
- Ambition Level: {ambition_map.get(ambition_level, ambition_level)}
- Current State: {confidence_map.get(confidence_level, confidence_level)}

Generate 12 personalised, ranked research topic suggestions for this student.
Group into 3-4 thematic clusters. Sort topics by suitability score descending.
""",
    )

    output: TopicDiscoveryOutput = result.final_output

    print(f"✅ Topic discovery complete")
    print(f"   Clusters: {output.clusters}")
    print(f"   Topics generated: {len(output.topics)}")
    for t in output.topics[:3]:
        print(f"   [{t.suitability_score}%] {t.title[:60]}")

    # Sort by suitability score descending (agent should do this, but enforce here too)
    output.topics.sort(key=lambda t: t.suitability_score, reverse=True)

    return output


# ══════════════════════════════════════════════════════════════════════════════
# Stages 2-4 — Topic Advisor (conversational feasibility chat)
# ══════════════════════════════════════════════════════════════════════════════

async def run_topic_advisor(
    topic_title:     str,
    topic_one_liner: str,
    field:           str,
    degree_level:    str,
    ambition_level:  str,
    stage:           Literal["explain", "questions", "feasibility", "final"],
    student_message: Optional[str],
    conversation:    List[dict],
) -> TopicAdvisorOutput:
    """
    Stages 2-4 of the Topic Discovery Engine.
    Runs the conversational AI advisor for a selected topic.

    Each stage uses a purpose-specific agent:
      - "explain"     → topic_advisor_explain_agent
      - "questions"   → topic_advisor_questions_agent
      - "feasibility" → topic_advisor_feasibility_agent
      - "final"       → topic_advisor_final_agent

    Called by: POST /topics/refine
    """

    print(f"\n💬 TOPIC ADVISOR — Stage: {stage.upper()}")
    print(f"   Topic: {topic_title[:60]}")
    print(f"   Field: {field} | Level: {degree_level}")
    print("-" * 80)

    # Build conversation history string (same pattern as phase0_workflow.py)
    history_text = ""
    for msg in conversation:
        role = "Student" if msg.get("role") == "user" else "Advisor"
        history_text += f"\n{role}: {msg.get('content', '')}\n"

    # Select the appropriate agent for this stage
    agent_map = {
        "explain":     topic_advisor_explain_agent,
        "questions":   topic_advisor_questions_agent,
        "feasibility": topic_advisor_feasibility_agent,
        "final":       topic_advisor_final_agent,
    }
    agent = agent_map[stage]

    # Build the input for the selected stage
    if stage == "explain":
        input_text = f"""
TOPIC: {topic_title}
ONE-LINER: {topic_one_liner}
FIELD: {field}
DEGREE LEVEL: {degree_level}
AMBITION: {ambition_level}

Explain this topic to the student and ask your first feasibility question.
"""

    elif stage == "questions":
        input_text = f"""
TOPIC: {topic_title}
FIELD: {field}
DEGREE LEVEL: {degree_level}
AMBITION: {ambition_level}

CONVERSATION SO FAR:
{history_text}

STUDENT'S LATEST REPLY:
{student_message or '(no reply yet)'}

Continue the feasibility questions conversation.
"""

    elif stage == "feasibility":
        input_text = f"""
TOPIC: {topic_title}
FIELD: {field}
DEGREE LEVEL: {degree_level}
AMBITION: {ambition_level}

FULL CONVERSATION:
{history_text}

STUDENT'S FINAL REPLY BEFORE ASSESSMENT:
{student_message or '(no reply)'}

Provide your full feasibility assessment and recommendation.
"""

    else:  # final
        input_text = f"""
ORIGINAL TOPIC: {topic_title}
FIELD: {field}
DEGREE LEVEL: {degree_level}

FULL CONVERSATION:
{history_text}

STUDENT'S FINAL DECISION:
{student_message or 'Proceed with the topic as discussed.'}

Produce the final refined topic output in the required format.
"""

    result = await Runner.run(
        starting_agent=agent,
        input=input_text,
    )

    output: TopicAdvisorOutput = result.final_output

    print(f"✅ Topic advisor stage '{stage}' complete")
    print(f"   Response preview: {output.message[:100]}…")

    return output


# ══════════════════════════════════════════════════════════════════════════════
# Utility: Parse the structured final stage output
# ══════════════════════════════════════════════════════════════════════════════

def parse_final_topic(raw_message: str, fallback_title: str) -> FinalTopicOutput:
    """
    Parses the structured text from topic_advisor_final_agent into a
    FinalTopicOutput model.

    The agent is instructed to format its response with labelled sections.
    This function extracts each section by looking for the label headers.
    Falls back gracefully if parsing fails.
    """

    def _extract_section(text: str, start_label: str, end_labels: List[str]) -> str:
        """Extract text between start_label and the next end_label."""
        pattern = re.compile(
            rf"{re.escape(start_label)}\s*\n(.*?)(?={'|'.join(re.escape(l) for l in end_labels)}|$)",
            re.DOTALL | re.IGNORECASE,
        )
        match = pattern.search(text)
        return match.group(1).strip() if match else ""

    all_labels = [
        "FINAL TOPIC TITLE:",
        "DESCRIPTION:",
        "NEXT STEPS:",
        "READY MESSAGE:",
    ]

    title = _extract_section(raw_message, "FINAL TOPIC TITLE:", all_labels[1:]) or fallback_title
    description = _extract_section(raw_message, "DESCRIPTION:", all_labels[2:])
    next_steps_raw = _extract_section(raw_message, "NEXT STEPS:", all_labels[3:])
    ready_message = _extract_section(raw_message, "READY MESSAGE:", [])

    # Parse numbered next steps
    steps = []
    for line in next_steps_raw.split("\n"):
        line = line.strip()
        if line and re.match(r"^\d+\.", line):
            steps.append(re.sub(r"^\d+\.\s*", "", line).strip())

    if not steps:
        steps = [
            "Review foundational literature in your specific sub-area",
            "Confirm access to the data or resources your project requires",
            "Upload your university's guidelines PDF to generate your full specification",
        ]

    print(f"\n📋 Final topic parsed:")
    print(f"   Title: {title}")
    print(f"   Steps: {len(steps)}")

    return FinalTopicOutput(
        suggested_title=title,
        description=description or "A focused, feasibility-validated research project tailored to your profile.",
        next_steps=steps[:3],
        ready_message=ready_message or "Click 'Use This Topic' to start generating your full research specification.",
    )
