"""
Topic Discovery Routes
======================
Completely separate from spec generation.
Helps confused students find and refine a research topic BEFORE generating a spec.

Endpoints:
  POST /topics/discover   — Stage 1: form → 10-15 ranked topic suggestions
  POST /topics/refine     — Stage 3: selected topic → feasibility chat response
"""

from __future__ import annotations

import json
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user

router = APIRouter(prefix="/topics", tags=["Topic Discovery"])


# ─── Request / Response Models ─────────────────────────────────────────────────

class TopicDiscoveryRequest(BaseModel):
    """Stage 1 — the 8-question form"""
    degree_level:      Literal["BSc", "MSc"]
    field:             str
    project_type:      Literal["research-based", "practical", "mixed", "not-sure"]
    preferred_activity: List[str]   # multi-select
    interest_areas:    List[str]    # multi-select
    geographic_focus:  Literal["university", "city", "country", "africa","Europe","global", "none"]
    ambition_level:    Literal["manageable", "impressive", "distinction", "cv-strong"]
    confidence_level:  Literal["very-confused", "somewhat-unsure", "rough-direction", "have-idea"]


class TopicSuggestion(BaseModel):
    id:                 str   # slug e.g. "ml-health-01"
    title:              str
    cluster:            str   # group label e.g. "Health Technology"
    complexity:         Literal["Low", "Medium", "High"]
    research_depth:     Literal["Light", "Moderate", "Deep"]
    implementation:     Literal["Theoretical", "Mixed", "Hands-on"]
    suitability_score:  int   # 1-100
    suitability_reason: str
    one_liner:          str   # plain-English what the project does


class TopicDiscoveryResponse(BaseModel):
    clusters:           List[str]             # ordered cluster names
    topics:             List[TopicSuggestion]
    prompt_note:        str                   # e.g. "Based on your profile, here are your best matches…"


class TopicRefineRequest(BaseModel):
    """Stage 3 — selected topic + student's answers to follow-up questions"""
    topic_title:        str
    topic_one_liner:    str
    field:              str
    degree_level:       str
    ambition_level:     str
    stage:              Literal["explain", "questions", "feasibility", "final"]
    student_message:    Optional[str] = None   # student's reply (None for first call)
    conversation:       List[dict]   = Field(default_factory=list)  # full chat history


class TopicRefineResponse(BaseModel):
    ai_message:         str
    is_final:           bool = False
    refined_topic:      Optional[str] = None   # populated on final stage
    refined_description: Optional[str] = None
    suggested_title:    Optional[str] = None


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _build_discover_prompt(req: TopicDiscoveryRequest) -> str:
    activities = ", ".join(req.preferred_activity) or "Not specified"
    interests  = ", ".join(req.interest_areas) or "Not specified"

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

    return f"""
You are a senior academic advisor helping a student find the perfect research topic.

STUDENT PROFILE:
- Degree Level: {req.degree_level}
- Field / Department: {req.field}
- Project Type Required: {req.project_type.replace('-', ' ').title()}
- Preferred Activity: {activities}
- Interest Areas: {interests}
- Geographic Focus: {req.geographic_focus.title()}
- Ambition Level: {ambition_map.get(req.ambition_level, req.ambition_level)}
- Current State: {confidence_map.get(req.confidence_level, req.confidence_level)}

YOUR TASK:
Generate exactly 12 research topic suggestions. Group them into 3-4 thematic clusters.
For each topic provide a JSON object with these exact fields:
  - id: short slug (e.g. "health-ml-01")
  - title: clear, specific topic title
  - cluster: the cluster name this topic belongs to
  - complexity: "Low" | "Medium" | "High"
  - research_depth: "Light" | "Moderate" | "Deep"
  - implementation: "Theoretical" | "Mixed" | "Hands-on"
  - suitability_score: integer 1-100 (how well it matches this student)
  - suitability_reason: 1 sentence why this suits this specific student
  - one_liner: plain English what the project actually does (20 words max)

RULES:
- Topics must be realistic for a {req.degree_level} student in {req.field}
- Respect geographic focus: {req.geographic_focus}
- Match ambition: {req.ambition_level}
- All topics must be achievable in a standard academic year
- Do NOT suggest topics requiring rare access, expensive equipment, or classified data
- Vary complexity across topics so student has options

Respond ONLY with a JSON object:
{{
  "prompt_note": "1-2 sentences personalised to this student's profile",
  "clusters": ["ClusterName1", "ClusterName2", ...],
  "topics": [ ...array of topic objects... ]
}}
""".strip()


def _build_refine_prompt(req: TopicRefineRequest) -> str:
    history_text = ""
    for msg in req.conversation:
        role = "Student" if msg.get("role") == "user" else "Advisor"
        history_text += f"\n{role}: {msg.get('content','')}\n"

    if req.stage == "explain":
        return f"""
You are an expert academic advisor. A student just selected this topic:

TOPIC: {req.topic_title}
ONE-LINER: {req.topic_one_liner}
FIELD: {req.field}
LEVEL: {req.degree_level}

Your job (Stage 2 — Explain):
1. In 2-3 short paragraphs, explain what this topic typically involves.
2. What kind of work the student will be doing day-to-day.
3. What the final output/deliverable usually looks like.
4. End by asking your FIRST feasibility question (about their data access or prior knowledge).

Keep it encouraging, clear, and jargon-free. No bullet points — conversational paragraphs.
""".strip()

    elif req.stage == "questions":
        return f"""
You are an expert academic advisor. A student is exploring this topic:

TOPIC: {req.topic_title}
FIELD: {req.field}
LEVEL: {req.degree_level}
AMBITION: {req.ambition_level}

CONVERSATION SO FAR:
{history_text}

STUDENT'S LATEST REPLY: {req.student_message}

Continue the feasibility conversation. Ask the NEXT most important question from this list (pick whichever hasn't been covered):
- Data access (do they have access to necessary datasets/participants?)
- Technical skills (coding, stats, lab skills?)
- Timeline (how many weeks/months do they have?)
- Supervisor/resources (do they have domain supervisor support?)
- Ethics (does this involve human participants, sensitive data?)

Ask ONE question at a time. Be conversational. Acknowledge their previous answer briefly before asking.
When you've asked 4-5 questions total, transition to feasibility assessment.
""".strip()

    elif req.stage == "feasibility":
        return f"""
You are an expert academic advisor doing a feasibility assessment.

TOPIC: {req.topic_title}
FIELD: {req.field}
LEVEL: {req.degree_level}
AMBITION: {req.ambition_level}

FULL CONVERSATION:
{history_text}

STUDENT'S FINAL REPLY: {req.student_message}

Now provide your feasibility assessment:
1. What works well about this topic for this student (2-3 specific points)
2. What challenges or risks exist
3. If there are significant risks, suggest ONE refined/scaled version of the topic that addresses them
4. State clearly: "This topic is [READY / NEEDS REFINEMENT / RECOMMEND ALTERNATIVE]"

End by asking: "Would you like to proceed with [final topic name] or would you like me to suggest refinements?"
""".strip()

    else:  # final
        return f"""
You are an expert academic advisor finalising a topic for a student.

ORIGINAL TOPIC: {req.topic_title}
FIELD: {req.field}
LEVEL: {req.degree_level}

FULL CONVERSATION:
{history_text}

STUDENT'S DECISION: {req.student_message}

Produce the FINAL REFINED TOPIC output:

1. Write the final polished topic title (specific, academic, 10-15 words)
2. Write a 2-paragraph description of the project (what it is, what it will do, expected contribution)
3. List 3 key next steps for the student to start their specification

Format your response as:

FINAL TOPIC TITLE:
[title here]

DESCRIPTION:
[two paragraphs]

NEXT STEPS:
1. [step]
2. [step]
3. [step]

READY MESSAGE:
[One encouraging sentence to close — tell them to click "Use This Topic" to start their specification]
""".strip()


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/discover", response_model=TopicDiscoveryResponse)
async def discover_topics(
    req:  TopicDiscoveryRequest,
    user = Depends(get_current_user),
):
    """
    Stage 1: Takes the 8-question form and returns 10-15 ranked topic suggestions.
    Uses the OpenAI Responses API directly (no agents SDK overhead for this simple call).
    """
    import os
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    prompt = _build_discover_prompt(req)

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)

        topics = [TopicSuggestion(**t) for t in data.get("topics", [])]
        # Sort by suitability score desc
        topics.sort(key=lambda t: t.suitability_score, reverse=True)

        return TopicDiscoveryResponse(
            clusters=data.get("clusters", []),
            topics=topics,
            prompt_note=data.get("prompt_note", "Here are your personalised topic suggestions."),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Topic generation failed: {str(e)}",
        )


@router.post("/refine", response_model=TopicRefineResponse)
async def refine_topic(
    req:  TopicRefineRequest,
    user = Depends(get_current_user),
):
    """
    Stage 2-4: Conversational feasibility chat for a selected topic.
    Call with stage="explain" first, then stage="questions" for follow-ups,
    then stage="feasibility", then stage="final".
    """
    import os
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    prompt = _build_refine_prompt(req)

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
        )
        ai_text = response.choices[0].message.content.strip()

        is_final = req.stage == "final"
        refined_topic = None
        refined_description = None
        suggested_title = None

        if is_final:
            # Parse the structured final output
            lines = ai_text.split("\n")
            title_idx = next((i for i, l in enumerate(lines) if "FINAL TOPIC TITLE:" in l), -1)
            desc_idx  = next((i for i, l in enumerate(lines) if "DESCRIPTION:" in l), -1)

            if title_idx >= 0 and title_idx + 1 < len(lines):
                suggested_title = lines[title_idx + 1].strip()

            if desc_idx >= 0:
                desc_lines = []
                for line in lines[desc_idx + 1:]:
                    if line.strip().startswith("NEXT STEPS:") or line.strip().startswith("READY MESSAGE:"):
                        break
                    desc_lines.append(line)
                refined_description = "\n".join(desc_lines).strip()

            refined_topic = suggested_title or req.topic_title

        return TopicRefineResponse(
            ai_message=ai_text,
            is_final=is_final,
            refined_topic=refined_topic,
            refined_description=refined_description,
            suggested_title=suggested_title,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Topic refinement failed: {str(e)}",
        )
