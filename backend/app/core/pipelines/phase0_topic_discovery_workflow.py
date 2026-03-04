"""
Phase 0 Topic Discovery Workflow — v5 (Phase 2 Vetter Addition)
================================================================
File: backend/app/core/pipelines/phase0_topic_discovery_workflow.py

CHANGES from v4:
  - Added VetTopicOutput dataclass (local, not a DB model — just pipeline output)
  - Added run_topic_vet() — runs topic_vetter_agent and parses the structured
    plain-text response into a clean VetTopicOutput object.
  - Added parse_vet_result() helper — mirrors parse_final_topic() structure.
  - All existing functions (run_topic_discovery, run_data_scout, run_project_scout,
    run_topic_advisor, parse_final_topic) are COMPLETELY UNCHANGED.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import List, Optional, Literal

from agents import Runner

from app.models.topic_discovery import (
    TopicDiscoveryOutput,
    TopicAdvisorOutput,
    TopicScoutOutput,
    ProjectScoutOutput,
    FinalTopicOutput,
    ScoutDataset, ScoutPaper, ScoutTool, ScoutKeyAuthor,
    SimilarProject,
)
from app.core.agents.definitions.phase0_agents import (
    topic_discovery_agent,
    topic_data_scout_agent,
    topic_project_scout_agent,
    topic_vetter_agent,
    topic_advisor_explain_agent,
    topic_advisor_questions_agent,
    topic_advisor_feasibility_agent,
    topic_advisor_final_agent,
)


# ══════════════════════════════════════════════════════════════════════════════
# Vetter Output (local dataclass — not persisted directly, used by /vet route)
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class VetTopicOutput:
    """
    Structured result from the topic vetter agent.
    Returned by run_topic_vet() and serialised by the /topics/vet endpoint.
    """
    verdict:          str          # "STRONG" | "REFINED" | "PIVOTED"
    your_take:        str          # 2-3 sentence honest reaction
    strengths:        List[str]    # 2-3 specific strengths
    concerns:         List[str]    # 0-2 specific concerns
    original_title:   str          # verbatim original topic
    refined_title:    str          # improved title (or same if STRONG)
    refined_rationale:str          # why the refined version is better
    one_liner:        str          # ≤20-word project description
    closing:          str          # warm one-sentence closing
    ai_message:       str          # full raw message for display fallback


# ══════════════════════════════════════════════════════════════════════════════
# Stage 1 — Topic Discovery (UNCHANGED)
# ══════════════════════════════════════════════════════════════════════════════

async def run_topic_discovery(
    degree_level: str, field: str, project_type: str,
    preferred_activity: List[str], interest_areas: List[str],
    geographic_focus: str, ambition_level: str, confidence_level: str,
) -> TopicDiscoveryOutput:

    print(f"\n💡 TOPIC DISCOVERY — Stage 1")
    print(f"   Field: {field} | Level: {degree_level}")
    print("-" * 80)

    ambition_map = {
        "manageable":  "Wants a safe, achievable project",
        "impressive":  "Wants to stand out — solid novel angle",
        "distinction": "Targeting distinction/first-class",
        "cv-strong":   "Career-focused — portfolio-ready work",
    }
    confidence_map = {
        "very-confused":   "Student has no idea where to start",
        "somewhat-unsure": "Has a general area but no clear topic",
        "rough-direction": "Has a direction but needs narrowing",
        "have-idea":       "Has a rough idea, needs validation",
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

Generate 12 personalised, ranked research topic suggestions.
Group into 3-4 thematic clusters. Sort by suitability score descending.
""",
    )

    output: TopicDiscoveryOutput = result.final_output
    output.topics.sort(key=lambda t: t.suitability_score, reverse=True)

    print(f"✅ Topic discovery complete — {len(output.topics)} topics")
    return output


# ══════════════════════════════════════════════════════════════════════════════
# Stage 1.5 — Data / Literature Scout (UNCHANGED)
# ══════════════════════════════════════════════════════════════════════════════

def _parse_scout_json(raw: str, project_type: str) -> TopicScoutOutput:
    """
    Parses the JSON returned by the scout agent into a TopicScoutOutput.
    Falls back gracefully if the agent returns malformed JSON.
    """
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    cleaned = cleaned.strip("`").strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"   ⚠️  Scout JSON parse failed, using raw text fallback")
        return TopicScoutOutput(
            scout_type="dataset" if project_type != "research-based" else "literature",
            availability_summary=raw[:500],
            data_verdict="UNKNOWN",
        )

    scout_type = data.get("scout_type", "dataset")

    datasets = [
        ScoutDataset(
            name=d.get("name", "Unknown"),
            description=d.get("description", ""),
            source=d.get("source", ""),
            url=d.get("url", ""),
            access=d.get("access", "Free"),
        )
        for d in data.get("datasets", [])
        if d.get("url")
    ]

    papers = [
        ScoutPaper(
            title=p.get("title", ""),
            year=str(p.get("year", "")),
            relevance=p.get("relevance", ""),
            url=p.get("url", ""),
        )
        for p in data.get("papers", [])
        if p.get("url")
    ]

    tools = [
        ScoutTool(
            name=t.get("name", ""),
            description=t.get("description", ""),
            url=t.get("url", ""),
        )
        for t in data.get("tools", [])
        if t.get("url")
    ]

    key_authors = [
        ScoutKeyAuthor(
            name=a.get("name", ""),
            institution=a.get("institution", ""),
            contribution=a.get("contribution", ""),
        )
        for a in data.get("key_authors", [])
    ]

    return TopicScoutOutput(
        scout_type=scout_type,
        datasets=datasets,
        papers=papers,
        tools=tools,
        key_authors=key_authors,
        availability_summary=data.get("availability_summary", ""),
        data_verdict=data.get("data_verdict", ""),
    )


async def run_data_scout(
    topic_title:  str,
    field:        str,
    degree_level: str,
    project_type: str = "mixed",
) -> TopicScoutOutput:
    """
    Stage 1.5: Searches for resources for a selected topic.
    - project_type == "research-based" → literature/paper search only
    - all others → dataset + paper + tool search
    Called by: POST /topics/scout
    """

    is_literature = project_type == "research-based"
    mode = "LITERATURE BASED" if is_literature else "DATASET REQUIRED"

    print(f"\n🔍 DATA SCOUT — {mode}")
    print(f"   Topic: {topic_title[:60]}")
    print(f"   Field: {field} | Level: {degree_level}")
    print("-" * 80)

    result = await Runner.run(
        starting_agent=topic_data_scout_agent,
        input=f"""
PROJECT TYPE: {mode}

TOPIC: {topic_title}
FIELD: {field}
DEGREE LEVEL: {degree_level}

{'Search for datasets, papers, and tools.' if not is_literature else 'Search for survey papers, seminal works, key authors, and literature tools only. No datasets needed.'}

Return ONLY the JSON structure as specified in your instructions.
""",
    )

    raw_output = result.final_output
    raw_text = raw_output.message if hasattr(raw_output, 'message') else str(raw_output)

    structured = _parse_scout_json(raw_text, project_type)

    print(f"✅ Scout complete — type: {structured.scout_type}")
    print(f"   Datasets: {len(structured.datasets)} | Papers: {len(structured.papers)} | Tools: {len(structured.tools)}")

    return structured


# ══════════════════════════════════════════════════════════════════════════════
# Post-Final Stage — Similar Projects Scout (UNCHANGED)
# ══════════════════════════════════════════════════════════════════════════════

def _parse_project_scout_json(raw: str) -> ProjectScoutOutput:
    """Parse the project scout agent's JSON output."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"   ⚠️  Project scout JSON parse failed")
        return ProjectScoutOutput(search_note="Search completed but results could not be parsed.")

    projects = [
        SimilarProject(
            title=p.get("title", ""),
            author=p.get("author", "Unknown"),
            year=str(p.get("year", "")),
            institution=p.get("institution", ""),
            level=p.get("level", ""),
            similarity_score=int(p.get("similarity_score", 0)),
            similarity_reason=p.get("similarity_reason", ""),
            url=p.get("url", ""),
            abstract_snippet=p.get("abstract_snippet", ""),
        )
        for p in data.get("projects", [])
        if p.get("url") and int(p.get("similarity_score", 0)) >= 50
    ]

    return ProjectScoutOutput(
        projects=projects,
        search_note=data.get("search_note", ""),
    )


async def run_project_scout(
    topic_title:  str,
    field:        str,
    degree_level: str,
) -> ProjectScoutOutput:
    """
    Post-final stage: Finds 2 real similar student projects for use as
    'past projects' in the spec generation pipeline.
    Called by: POST /topics/find-projects
    """

    print(f"\n🎓 PROJECT SCOUT — finding similar student projects")
    print(f"   Topic: {topic_title[:60]}")
    print(f"   Field: {field} | Level: {degree_level}")
    print("-" * 80)

    result = await Runner.run(
        starting_agent=topic_project_scout_agent,
        input=f"""
Find 2 real student projects (theses, dissertations, final year projects) similar to:

TOPIC: {topic_title}
FIELD: {field}
DEGREE LEVEL: {degree_level}

Search thoroughly using multiple queries as described in your instructions.
Return ONLY the JSON structure as specified.
""",
    )

    raw_output = result.final_output
    raw_text = raw_output.message if hasattr(raw_output, 'message') else str(raw_output)

    structured = _parse_project_scout_json(raw_text)

    print(f"✅ Project scout complete — {len(structured.projects)} project(s) found")
    for p in structured.projects:
        print(f"   [{p.similarity_score}%] {p.title[:50]}")

    return structured


# ══════════════════════════════════════════════════════════════════════════════
# NEW: Topic Vetter — "I already have a topic" path
# ══════════════════════════════════════════════════════════════════════════════

def _extract_vet_section(text: str, label: str, next_labels: List[str]) -> str:
    """
    Extracts the content under a plain-text section label from the vetter's output.
    Same approach as parse_final_topic() — label-based extraction, no regex magic.
    """
    pattern = re.compile(
        rf"{re.escape(label)}\s*\n(.*?)(?={'|'.join(re.escape(l) for l in next_labels)}|$)",
        re.DOTALL | re.IGNORECASE,
    )
    m = pattern.search(text)
    return m.group(1).strip() if m else ""


def _parse_numbered_list(raw: str) -> List[str]:
    """Parse a numbered list from plain text — returns list of items without numbering."""
    items = []
    for line in raw.split("\n"):
        line = line.strip()
        if line and re.match(r"^\d+\.", line):
            items.append(re.sub(r"^\d+\.\s*", "", line).strip())
    return items


def parse_vet_result(raw_message: str, original_topic: str) -> VetTopicOutput:
    """
    Parses the topic vetter agent's structured plain-text response into
    a VetTopicOutput dataclass.

    Expected section labels (from phase0_topic_vetter.py instructions):
      VERDICT:
      YOUR TAKE:
      WHAT'S WORKING:
      WHAT NEEDS ATTENTION:
      ORIGINAL TITLE:
      REFINED TITLE:
      REFINED RATIONALE:
      ONE LINER:
      CLOSING:
    """

    all_labels = [
        "VERDICT:",
        "YOUR TAKE:",
        "WHAT'S WORKING:",
        "WHAT NEEDS ATTENTION:",
        "ORIGINAL TITLE:",
        "REFINED TITLE:",
        "REFINED RATIONALE:",
        "ONE LINER:",
        "CLOSING:",
    ]

    def _get(label: str) -> str:
        idx    = all_labels.index(label)
        nexts  = all_labels[idx + 1:]
        return _extract_vet_section(raw_message, label, nexts)

    # ── Verdict (normalise to uppercase) ─────────────────────────────────────
    verdict_raw = _get("VERDICT:").strip().upper()
    if "REFINED" in verdict_raw:
        verdict = "REFINED"
    elif "PIVOTED" in verdict_raw:
        verdict = "PIVOTED"
    else:
        verdict = "STRONG"

    # ── Strengths & Concerns (numbered lists) ─────────────────────────────────
    strengths_raw = _get("WHAT'S WORKING:")
    concerns_raw  = _get("WHAT NEEDS ATTENTION:")

    strengths = _parse_numbered_list(strengths_raw)
    concerns  = _parse_numbered_list(concerns_raw)

    # ── Titles ────────────────────────────────────────────────────────────────
    original_title = _get("ORIGINAL TITLE:") or original_topic
    refined_title  = _get("REFINED TITLE:")  or original_topic

    # ── Narrative sections ────────────────────────────────────────────────────
    your_take         = _get("YOUR TAKE:")
    refined_rationale = _get("REFINED RATIONALE:")
    one_liner         = _get("ONE LINER:")
    closing           = _get("CLOSING:")

    # ── Fallbacks for robustness ──────────────────────────────────────────────
    if not strengths:
        strengths = ["Topic is within your field of study", "Clear research focus identified"]
    if not one_liner:
        one_liner = f"A research project exploring {original_topic.lower()}."
    if not closing:
        closing = "Both options are viable — choose whichever feels right."

    print(f"   Verdict: {verdict}")
    print(f"   Original: {original_title[:50]}")
    print(f"   Refined:  {refined_title[:50]}")

    return VetTopicOutput(
        verdict=verdict,
        your_take=your_take,
        strengths=strengths,
        concerns=concerns,
        original_title=original_title,
        refined_title=refined_title,
        refined_rationale=refined_rationale,
        one_liner=one_liner,
        closing=closing,
        ai_message=raw_message,
    )


async def run_topic_vet(
    original_topic:   str,
    field:            str,
    degree_level:     str,
    project_type:     str   = "mixed",
    geographic_focus: str   = "none",
    ambition_level:   str   = "impressive",
) -> VetTopicOutput:
    """
    Vets a student's existing topic idea.

    Runs the topic_vetter_agent against the student's context and returns
    a structured VetTopicOutput with verdict, strengths, concerns,
    and an optionally refined topic title.

    Called by: POST /topics/vet
    """

    print(f"\n🔬 TOPIC VETTER — evaluating student's topic")
    print(f"   Original: {original_topic[:60]}")
    print(f"   Field: {field} | Level: {degree_level}")
    print("-" * 80)

    result = await Runner.run(
        starting_agent=topic_vetter_agent,
        input=f"""
ORIGINAL TOPIC: {original_topic}
FIELD: {field}
DEGREE LEVEL: {degree_level}
PROJECT TYPE: {project_type.replace('-', ' ').title()}
GEOGRAPHIC FOCUS: {geographic_focus.title()}
AMBITION LEVEL: {ambition_level}

Evaluate this topic and produce the structured plain-text output as instructed.
""",
    )

    raw_output = result.final_output
    raw_text   = raw_output.message if hasattr(raw_output, 'message') else str(raw_output)

    vet_result = parse_vet_result(raw_text, original_topic)

    print(f"✅ Vetting complete — verdict: {vet_result.verdict}")
    return vet_result


# ══════════════════════════════════════════════════════════════════════════════
# Stages 2-4 — Topic Advisor (UNCHANGED)
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
    scout_context:   Optional[str] = None,
) -> TopicAdvisorOutput:

    print(f"\n💬 TOPIC ADVISOR — Stage: {stage.upper()}")
    print(f"   Topic: {topic_title[:60]}")
    print("-" * 80)

    history_text = ""
    for msg in conversation:
        role = "Student" if msg.get("role") == "user" else "Advisor"
        history_text += f"\n{role}: {msg.get('content', '')}\n"

    agent_map = {
        "explain":     topic_advisor_explain_agent,
        "questions":   topic_advisor_questions_agent,
        "feasibility": topic_advisor_feasibility_agent,
        "final":       topic_advisor_final_agent,
    }
    agent = agent_map[stage]

    if stage == "explain":
        input_text = f"""
TOPIC: {topic_title}
ONE-LINER: {topic_one_liner}
FIELD: {field}
DEGREE LEVEL: {degree_level}
AMBITION: {ambition_level}

{f"RESOURCES ALREADY FOUND (web search done — do NOT ask if they have data):{chr(10)}{scout_context}" if scout_context else "No resources were pre-searched for this topic."}

Explain the topic, present what was found, then ask about their technical skills.
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

Ask the next feasibility question. Do NOT ask about data — already covered.
"""
    elif stage == "feasibility":
        input_text = f"""
TOPIC: {topic_title}
FIELD: {field}
DEGREE LEVEL: {degree_level}
AMBITION: {ambition_level}

FULL CONVERSATION:
{history_text}

STUDENT'S REPLY:
{student_message or '(no reply)'}

Give your feasibility assessment using the plain-text section format.
"""
    else:
        input_text = f"""
ORIGINAL TOPIC: {topic_title}
FIELD: {field}
DEGREE LEVEL: {degree_level}

FULL CONVERSATION:
{history_text}

STUDENT'S FINAL DECISION:
{student_message or 'Proceed as discussed.'}

Produce the final refined topic output using the exact plain-text format.
"""

    result = await Runner.run(starting_agent=agent, input=input_text)
    output: TopicAdvisorOutput = result.final_output
    print(f"✅ Advisor stage '{stage}' complete")
    return output


# ══════════════════════════════════════════════════════════════════════════════
# Utility — Parse final topic (UNCHANGED)
# ══════════════════════════════════════════════════════════════════════════════

def parse_final_topic(raw_message: str, fallback_title: str) -> FinalTopicOutput:
    def _extract(text: str, start: str, ends: List[str]) -> str:
        pattern = re.compile(
            rf"{re.escape(start)}\s*\n(.*?)(?={'|'.join(re.escape(e) for e in ends)}|$)",
            re.DOTALL | re.IGNORECASE,
        )
        m = pattern.search(text)
        return m.group(1).strip() if m else ""

    labels    = ["FINAL TOPIC TITLE:", "DESCRIPTION:", "NEXT STEPS:", "READY MESSAGE:"]
    title       = _extract(raw_message, labels[0], labels[1:]) or fallback_title
    description = _extract(raw_message, labels[1], labels[2:])
    steps_raw   = _extract(raw_message, labels[2], labels[3:])
    ready_msg   = _extract(raw_message, labels[3], [])

    steps = []
    for line in steps_raw.split("\n"):
        line = line.strip()
        if line and re.match(r"^\d+\.", line):
            steps.append(re.sub(r"^\d+\.\s*", "", line).strip())

    if not steps:
        steps = [
            "Review foundational literature in your specific sub-area",
            "Confirm access to the data or resources your project requires",
            "Upload your university guidelines PDF to generate your full specification",
        ]

    return FinalTopicOutput(
        suggested_title=title,
        description=description or "A focused, feasibility-validated research project.",
        next_steps=steps[:3],
        ready_message=ready_msg or "Click 'Use This Topic' to start generating your specification.",
    )
