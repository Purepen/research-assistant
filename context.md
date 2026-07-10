# Research Assistant — Project Context

_Last full codebase audit: 2026-07-10. This file is a living reference — update it when the architecture, known bugs, or dead-code inventory changes materially._

## 1. What this project is

A full-stack app that generates university-level academic research proposals ("specifications") through a 7-phase AI pipeline. A student fills in a form (field of study, topic, academic level, guidelines document, optional dataset/past-project uploads), and the backend runs a multi-agent pipeline that researches, synthesizes, writes, validates, reviews, and humanizes a complete research specification document (Justification, Objectives, Literature Review, Methodology, Work Plan, References, Abstract).

Built solo over ~7 months, starting from an initial ~18-hour structured build (documented in `DEVELOPMENT_CALENDAR.md`) and evolving iteratively since. Several source files contain changelog-style docstrings (e.g. "B5 — Signal Fix Edition" in `locked_requirements_builder.py`) documenting real production incidents fixed in place — this is an incident-driven, iterative codebase, not a single clean design pass.

## 2. Tech stack

**Backend:** FastAPI, SQLAlchemy ORM over SQLite (`research_assistant.db`), Pydantic models, **OpenAI Agents SDK** (`openai-agents` / `agents` package) for all AI agent orchestration, `python-docx` for document parsing/generation, Resend for transactional email, `uv`/pip for dependency management.

**Frontend:** Next.js 14.2 (App Router, fully client-rendered — every interactive page is `'use client'`), React 18.2, TypeScript 5.3 (strict), Zustand (+ `persist`) for auth state, TanStack React Query v5 for server state, axios, Tailwind CSS 3.4 (used inconsistently — see §7), Framer Motion.

**Auth:** JWT (HS256, 24h expiry) + Google OAuth (server-side ID token verification). BYOK: users can supply their own OpenAI API key and choose per-agent model tiers.

## 3. Repository layout

```
research-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, router mounting
│   │   ├── api/routes/             # auth, research, projects, topics, user
│   │   ├── api/dependencies.py     # get_current_user, DB session, table creation
│   │   ├── services/               # auth_service, research_service, storage_service
│   │   ├── models/                 # SQLAlchemy (database.py) + Pydantic schemas
│   │   ├── adapters/                # email (Resend), openai (unused), storage (local/S3)
│   │   ├── config/                  # settings.py — DEAD, not imported anywhere
│   │   ├── core/agents/definitions/ # Agent(...) objects per phase (phase0-6, post)
│   │   ├── core/agents/instructions/# prompt strings per agent
│   │   ├── core/pipelines/          # the actual orchestration logic per phase
│   │   ├── core/domain/             # mostly DEAD parallel domain-modeling layer
│   │   └── core/validation/         # spec_validator.py — zero-AI hard gate
│   ├── migrate.py                   # ad-hoc DB migrations (no Alembic)
│   └── requirements.txt / pyproject.toml  # MISSING openai-agents dependency
├── config/{default,dev,prod}.yaml   # DEAD — no code path reads these
├── frontend/
│   └── src/
│       ├── app/                     # Next.js pages (landing, auth, dashboard/*)
│       ├── components/              # generate/, landing/, results/, ui/ — several unused
│       ├── hooks/                   # useAuth, useProjects, useTopics, useUser
│       └── lib/api.ts, types/index.ts
├── test_backend.py                  # manual smoke-test script, root level
├── generate_pdf.py                  # unrelated dev utility (FPDF project-tree export)
└── context.md                       # this file
```

## 4. The AI pipeline (core feature)

Orchestration is **plain Python**, not the Agents SDK's handoff/tool-calling graph. Every agent is a simple `Agent(name, instructions, model, tools, output_type)`; pipeline code in `core/pipelines/*.py` calls `await Runner.run(starting_agent=agent, input=...)` sequentially/concurrently and stitches results together itself. Some agent prompts (`phase4_orchestrator.py`, `phase3_feasibility.py`) describe "hand off to X agent" workflows that were **never actually wired up** — vestigial/stale design language from an earlier plan.

Only two SDK tools are used anywhere: `WebSearchTool()` (hosted web search) and one custom `@function_tool` (`send_email`).

### Phase 0 — Guidelines & Topic (`phase0_workflow.py`, `phase0_topic_discovery_workflow.py`)
- `guidelines_parser_agent` parses an uploaded `.docx` into `ProjectGuidelines` (sections, word counts, citation style, timeline). Falls back to hardcoded `_DEFAULT_GUIDELINES` if nothing uploaded.
- Separate, richer **Topic Lab** engine (own frontend flow at `/dashboard/topics`, not part of `main_pipeline.py`'s direct path): `topic_discovery_agent` (12 ranked topic suggestions from a student profile), `topic_data_scout_agent` (web search for datasets/papers per topic), `topic_vetter_agent` ("I already have a topic" critique), a 4-stage `topic_advisor_*` conversational flow (explain → feasibility questions → verdict → final lock-in), `topic_project_scout_agent` (finds 2 real similar student projects).
- `dataset_profiler.py` — pure pandas, no LLM — profiles uploaded CSV/XLSX (row/col counts, dtypes, missing %, duplicates) so dataset facts can't be hallucinated later.

### Phase 1 — Resource Discovery (`phase1_workflow.py`, `phase1_paper_fetcher.py`)
Three parallel streams merged into one pool:
- **Web**: `web_search_agent` (WebSearchTool, up to 5 canned queries) → `resource_finder_agent` extracts structured `DiscoveredResources`.
- **Citation verification** (anti-hallucination core): `build_verified_citation_pool()` runs `paper_abstract_fetcher_agent` concurrently (semaphore=3) per discovered paper to fetch real abstracts/DOIs/metrics into `VerifiedPaper` objects. Only these verified papers may later be cited.
- **User uploads**: `past_projects_spec_analyzer_agent` extracts objectives/methodology/limitations/future-work (flagged as exploitable "GAPS") from uploaded prior-project docs.
- **Auto-discovery**: `project_finder_agent` (WebSearchTool) finds candidate thesis URLs → `project_analyzer_agent` extracts the same shape, merging into the same list as user uploads.
- **Track detection**: `locked_requirements_builder.py::detect_track()` — heuristic keyword matching → **Track A** (empirical/ML/quant) vs **Track B** (theoretical/humanities). Topic-title signals override field-name signals — fixed after a real incident ("B5": an Education-field econometrics topic was misrouted to Track B and scored 31/100).

### Phase 2 — Strategic Synthesis (`phase2_workflow.py`)
- Track A → `strategic_synthesizer_agent` → `StrategicSynthesis` (positioning, differentiation, novel contributions, performance targets, risks).
- Track B → `theoretical_synthesizer_b_agent` → `TheoreticalSynthesisB` (theoretical frameworks, scholarly debates as two-sided tensions, key scholars, research gaps) — explicitly forbidden from mentioning datasets/ML/accuracy.

### Locked Requirements (pre-Phase-3, pure Python, `locked_requirements_builder.py`)
The single most important data-flow artifact — freezes every upstream fact into one "ground truth" object (`LockedRequirementsA`/`B`) that all downstream writer agents must obey verbatim:
- `detect_paradigm()` (Track A only) → `ML_CLASSIFICATION`, `ECONOMETRIC_CAUSAL`, `SURVEY_QUANTITATIVE`, `SYSTEMS_ENGINEERING`, or `FINANCE_QUANT`.
- Paradigm-specific method/algorithm selection with hardcoded real citations (Wooldridge 2010, Rosenbaum & Rubin 1983, Nunnally 1978, Brooke 1996, etc.) — not LLM-generated.
- Selects `LockedBaseline` (highest-quality metric-bearing paper from the citation pool), builds `EvaluationFramework`, `EthicsStatement` (templated by data sensitivity), a pre-built week-by-week `work_plan_weeks`, and section word-count targets.

### Phase 3 — Section Specialists (`phase3_workflow.py` + `phase3_agents.py`)
7 sequential, single-purpose agents (plain-text output, each depends on prior output):
1. `justification_specialist` — must cite ≥2 citation-pool papers, critique ≥2 named similar projects, end in one aim sentence.
2. `objectives_architect` — exactly 5 numbered objectives, fixed sequence.
3. `literature_strategist` — ≥8 in-text citations, must synthesize not list.
4. `methodology_designer` — highest-weighted section; paradigm-routed template (ML variant has an 8-item mandatory checklist).
5. `timeline_validator` — Work Plan; strictly "weeks" not "months" (validator hard-fails on "month").
6. `references_compiler` — Harvard citations from the verified pool only, cross-checked against in-text citations.
7. `abstract_specialist` — written **last**, synthesizes the other 6 sections, 4-element structure (problem→gap→approach→predicted finding).

### Phase 4 — Formatting (`phase4_workflow.py` + `phase4_agents.py`)
- `specification_formatter` (always used in practice) assembles the 7 raw section strings into structured `ProjectSpecification` (computes word counts, key points).
- Legacy `specification_orchestrator` path is vestigial/unreachable (`locked` is never `None` in the real call path).
- Expansion pass: if `total_word_count < 70%` of target, re-runs formatter with "expand these sections" instructions.

### Phase 5 — Review Loop (`phase5_workflow.py` + `phase5_agents.py` + `spec_validator.py`)
- `spec_validator.py` (zero AI) runs first as a **hard, non-overridable gate**: word-count checks, Harvard citation regex count (≥10), paradigm-aware blocker checklist, marketing-language and paradigm-contamination detection.
- `professor_reviewer_agent` receives the validation report as a binding preamble — instructions explicitly forbid `APPROVED` if any blocker exists, cap section marks at 40% if word count < 80% of target.
- `run_specification_with_review_loop()` iterates up to `config.max_iterations`: generate → validate → review → (if not approved) feed blockers + `improvement_priorities` back as `previous_feedback` for regeneration. Returns the **best-scoring iteration**, not necessarily the last.

### Phase 6 — Post-processing (`phase6_humanizer_critic.py` — what `main_pipeline.py` actually calls "Phase 6")
- `critic_agent` (gpt-4o) — brutal section-by-section `STRONG/WEAK/FAILING` gap analysis, stored as `critic_output`; failure is non-fatal.
- `human_writer_agent` (gpt-4o) — rewrites every prose section (not references) to sound human: em-dash ban, no robotic transitions, varied rhythm. Per-section; if a rewrite comes back <40% of original length, reverts to the original. **The humanized spec replaces `final_specification`** — this is what's actually saved/downloaded/emailed.
- **Naming collision (RESOLVED 2026-07-10, WS0 0.7)**: there was a *second*, unrelated "Phase 6" — `phase6_workflow.py` (agent-based Resend delivery email). Direct verification showed it was **fully dead**: nothing imported it; the live email path is `email_adapter.py`'s *sync* `send_specification_email()` called from `research_service.py` (the identical function name is what confused the original audit). `phase6_workflow.py` deleted. `phase6_agents.py` (`email_agent`) remains but is unused at runtime — kept only because `EMAIL_AGENT` is a registry/UI key; removal candidate in 0.8.

### Model-tier / BYOK layer (cross-cutting)
Every phase function optionally accepts `agent_model_config` (`AgentModelConfig`, keyed by `AgentKey` enum). When present, a `build_phaseN_agents(config)` factory clones the module-level agents with a user-chosen model. **This only actually works for Phase 2, 4, and 5** — see Known Bugs §6.2.

### End-to-end data flow
```
Guidelines (.docx) → ProjectGuidelines          [Phase 0]
Dataset (.csv/.xlsx) → DatasetProfile           [Phase 0.5, pandas only]
research_topic (user or agent-suggested)         [Phase 0]
        │
        ▼
detect_track(field, topic) → "A" | "B"
        │
        ▼
Phase 1: DiscoveredResources + VerifiedPaper citation_pool + AnalyzedProjectSpecSections × N
        │
        ▼
Phase 2: StrategicSynthesis (A) | TheoreticalSynthesisB (B)
        │
        ▼
build_locked_requirements(...) → LockedRequirementsA | LockedRequirementsB
        │  (paradigm, baseline, evaluation, ethics, algorithms, work_plan, word targets)
        ▼
Phase 3: 7 specialists, sequential, each consuming `locked` + prior section output
        │
        ▼
Phase 4: specification_formatter → ProjectSpecification
        │
        ▼
Phase 5: validate → review → (loop on rejection, feed back previous_feedback) → best iteration
        │
        ▼
Phase 6: critic_agent → critic_output ; human_writer_agent → humanized final_specification
        │
        ▼
complete_results { config, guidelines, topic, track, synthesis, locked_requirements,
                    specification_results: { final_specification, final_review,
                                              all_iterations, critic_output }, duration }
        │
        ▼ (separate call site, outside main_pipeline.py)
research_service.py → EmailAdapter.send_specification_email() [adapters/email_adapter.py, Resend, sync, no LLM]
```

## 5. Domain models

**Real/live schemas** (`app/models/*.py`):
- `ProjectSpecification` — `project_title`, 6 `SpecificationSection` (name/content/word_count/key_points), `references`, `total_word_count`. The actual deliverable.
- `OverallReview`/`SectionReview` — `total_marks`, `decision` (APPROVED/REVISIONS REQUIRED/MAJOR REVISIONS/REJECTED), per-section marks/strengths/weaknesses, `critical_issues`, `improvement_priorities`.
- `LockedRequirementsA`/`B` (312 lines) — citation pool, `LockedDataset`, `LockedBaseline`, `EvaluationFramework`, `EthicsStatement`, paradigm enum, similar projects, work plan.
- `StrategicSynthesis`/`TheoreticalSynthesisB`, `DiscoveredResources`, `AnalyzedProjectSpecSections`, `ProjectGuidelines`, `AgentModelConfig`/`AgentKey`, topic-discovery output models.

**Dead/unused parallel layer** (`core/domain/*.py`) — see §6.3.

## 6. Known bugs (verified, not guesses)

1. **`GET /projects/{id}` always returns `current_phase: "Unknown"`.** `projects.py:117` builds `ProjectLifecycle(project.status)`, but `project.status` is `app.models.database.ProjectStatus` (plain `enum.Enum`) while `ProjectLifecycle`'s internal dicts are keyed on the structurally-similar-but-distinct `app.core.domain.project.ProjectStatus(str, Enum)`. Different hash → lookup never matches → silent fallback to `"Unknown"` (and `0` for progress %, though that path isn't currently called). Fails silently, easy to miss in testing.
2. **BYOK model-tier selection silently no-ops for Phase 1 and Phase 3.** Both `phase1_workflow.py` and `phase3_workflow.py` wrap `from ...phase1_agents import build_phase1_agents` / `...phase3_agents import build_phase3_agents` in `try/except Exception` — **neither function exists** in those two modules (only Phase 2/4/5/post have working tier-build helpers). Any non-`None agent_model_config` silently falls through to default `gpt-4o-mini` agents for these two phases — the two most expensive/most-called phases (7 specialists in Phase 3 alone). No error surfaces to the user, just a printed warning.
3. **`useAuth.ts` (frontend) imports `User` from `@/types`, which does not export it.** `src/types/index.ts` only exports `UserStats`, not `User`. `useAuth.ts` is imported by nearly every page (`Header`, `Sidebar`, `dashboard/page.tsx`, `profile`, `signin`, `register`, `dashboard/layout.tsx`) — this is load-bearing, not dead-code noise. `next build`/`tsc --noEmit` should currently fail on this unless something changed since the audit.
4. **`openai-agents` (the `agents` package) is absent from `backend/requirements.txt` and `pyproject.toml`** despite being used pervasively. A fresh install from the declared manifests would break on `import agents`.
5. **`POST /research/cancel/{project_id}` does not actually cancel the background task.** It only flips the DB `status` to `FAILED` so the frontend stops polling; the `asyncio` background generation task keeps running to completion (or its own failure) regardless, potentially still consuming OpenAI API credits after "cancellation." Frontend never calls this endpoint anyway (`researchApi.cancelGeneration` is defined but unused — no cancel button exists in the UI).
6. **`User.openai_api_key` (BYOK) is stored in plaintext** in SQLite. The model docstring in `database.py` claims "stored encrypted in production," but no encryption is implemented anywhere. A DB compromise directly exposes users' personal OpenAI keys.
7. **`JWT_SECRET_KEY` has an insecure hardcoded fallback** (`auth_service.py:27`, literal string `"your-secret-key"`) if the env var is unset. `.env.example` documents requiring a 32+ char secret, but nothing enforces this at startup (no fail-fast check).
8. **FIXED (2026-07-10, WS0 0.7): Two unrelated features were both called "Phase 6."** Verification showed `phase6_workflow.py` (agent-based Resend email) was dead code — zero imports; the live delivery is `email_adapter.py`'s sync method of the same name called from `research_service.py:203`. Deleted rather than renamed. "Phase 6" now unambiguously means `phase6_humanizer_critic.py`.
9. **`config/settings.py` + all of `config/*.yaml` are dead infrastructure** — never imported anywhere in the running app (verified by grep). All real config flows through scattered `os.getenv()` calls and hardcoded defaults in `SpecificationConfig`. Misleading: e.g. `prod.yaml`'s `storage.provider: s3` has zero actual effect; the real switch is the `STORAGE_TYPE` env var.
10. **Frontend results components reference nonexistent/renamed types** (dead but still type-checked): `results/SpecificationView.tsx` imports `Specification` from `@/types` (actual export is `ProjectSpecification`); `results/ReviewView.tsx` imports `Review` (actual export is `OverallReview`, with different field names — `section_reviews[].marks_awarded/marks_possible` vs real `marks/max_marks`). Since `tsconfig.json`'s `include` covers all `.tsx` regardless of import status, these should also fail `tsc`.
11. **`types/index.ts` is stale relative to actual runtime response shapes.** The live (non-dead) `projects/[id]/page.tsx` components expect fields like `review.section_scores`, `review.overall_feedback`, `result.critic` that don't exist in the declared `OverallReview`/`ResultResponse` types. Most list/detail components sidestep this by typing query data as `any`.

**Suggested priority order to fix:** #3 (frontend build-breaking) → #1 (visible user-facing bug) → #2 (silently broken paid feature) → #4 (deploy risk) → #6/#7 (security) → rest as time allows.

## 7. Dead code / stray duplicates inventory

Safe-to-delete candidates (all verified via repo-wide grep — zero live imports found):

**Backend:**
- `backend/app/api/routes/auth.py.backup` — untouched since the first commit; implements old Google-only auth (no register/login/verify/reset). Not imported.
- `backend/app/models/user.py` — duplicate `User` ORM with its own separate `declarative_base()`; missing `model_tier`/`custom_model_config`/`openai_api_key` columns added later to the real model in `database.py`. Landmine if anyone imports from the wrong module.
- `backend/app/core/domain/research_spec.py`, `review.py`, `specification.py` — an abandoned parallel "clean domain" modeling layer (DDD-style), duplicating `app/models/*` and `spec_validator.py`, zero imports anywhere. (Note: `backend/app/core/domain/project.py`'s `ProjectLifecycle` IS live — used in `projects.py:117`, see Bug #1 above — don't delete that one.)
- `backend/app/config/settings.py` + `config/default.yaml`, `config/dev.yaml`, `config/prod.yaml` — dead config infrastructure, see Bug #9.
- `backend/app/adapters/openai_adapter.py` — unused; real pipeline talks to OpenAI via the Agents SDK directly, not this adapter's `chat_completion`/`create_embedding`/`moderate_content`.

**Frontend:**
- `frontend/useAuth.ts` (project root, outside `src/`) — byte-identical stray duplicate of `src/hooks/useAuth.ts`. Not imported (everything uses `@/hooks/useAuth`).
- `src/app/Sidebar.tsx` — byte-identical duplicate of `src/app/dashboard/Sidebar.tsx` (the one actually imported).
- `src/components/generate/Step1BasicInfo.tsx`, `Step3Configuration.tsx`, `Step4Review.tsx`, `StepIndicator.tsx`, `GenerationLoadingScreen.tsx` — entirely unused; `dashboard/generate/page.tsx` reimplements all steps inline instead (only `Step2FileUploads`/`Step3Questions` are actually imported from this directory). These use a dark Tailwind theme inconsistent with the current light-green UI. `GenerationLoadingScreen.tsx` additionally polls a nonexistent relative API route and reads the wrong localStorage key — would silently fail even if reconnected.
- `src/components/results/ProgressTracker.tsx`, `ReviewView.tsx`, `SourcesView.tsx`, `SpecificationView.tsx` — entirely unused; `dashboard/projects/[id]/page.tsx` defines its own local versions of all of these inline. Two of these files also reference nonexistent types (see Bug #10).
- `react-hook-form` — listed in `package.json`, never imported anywhere in `src`.
- `projectsApi.downloadProject` and `researchApi.cancelGeneration` in `lib/api.ts` — defined, never called (download is reimplemented manually in `projects/[id]/page.tsx`; cancel has no UI entry point).

## 8. Backend API surface (reference)

- **`/auth`**: `POST /register`, `/login`, `/verify-email`, `/resend-verification`, `/request-password-reset`, `/reset-password`, `/google`, `GET /me`, `POST /refresh`.
- **`/research`**: `POST /generate` (multipart: `config_json` + optional guideline/past-project/dataset files → creates `Project`, runs generation as a background task), `GET /status/{id}`, `GET /result/{id}`, `POST /cancel/{id}` (see Bug #5).
- **`/projects`**: `GET /` (paginated list), `GET /{id}` (detail, see Bug #1), `DELETE /{id}`, `GET /{id}/analytics`, `GET /{id}/download` (in-memory `.docx` build via `python-docx`).
- **`/topics`** (Topic Lab, largest/most-evolved route file): `POST /discover`, `/scout`, `/refine`, `/find-projects`, `/vet`, `/vet/save`, `GET /history`, `POST /link-project`, `DELETE /history/{id}`.
- **`/user`**: `GET /profile`, `PATCH /profile`, `GET /stats`, `DELETE /account`, `GET`/`PUT /settings/models`, `GET`/`PUT /api-key` (PUT does a live `OpenAI.models.list()` validation call before persisting).

## 9. Frontend notes (reference)

- No websockets anywhere — all "live" progress is HTTP polling via React Query `refetchInterval` (`useProject` every 5s, `useProjectStatus` every 3s; `useProjectResult` gated on `status === 'complete'`).
- Auth token is stored in **three** separate localStorage locations (`access_token` raw string, `user`, and the Zustand-persisted `auth-storage` blob) with several call sites reading `access_token` directly instead of through a shared helper — refactor risk if the storage key ever changes.
- Protected routes are enforced entirely client-side in `dashboard/layout.tsx` (no `middleware.ts`); depends on the Zustand store hydrating correctly.
- Visual inconsistency: `forgot-password`/`reset-password`/`verify-email` use a blue/purple Tailwind gradient theme, while `signin`/`register`/dashboard use a green-branded custom CSS theme — looks like an earlier design iteration never restyled.
- Most dashboard pages redefine their own local `I = {...}` object of hand-written inline SVG icons instead of sharing one icon module (high duplication across `dashboard/page.tsx`, `projects/page.tsx`, `projects/[id]/page.tsx`, `Header.tsx`, `Sidebar.tsx`, `topics/page.tsx`, `profile/page.tsx`).
- Topic Lab (`dashboard/topics/page.tsx`, ~1160 lines) calls its backend endpoints via raw `axios` + manually-built `authHeaders()`, bypassing `lib/api.ts`'s centralized `topicsApi` — inconsistent with the rest of the app's API-calling pattern.

## 10. Recommended next steps

- Fix Bug #3 first — it likely breaks the frontend build today.
- Fix Bug #1 (project phase display) and Bug #2 (silently broken BYOK for Phase 1/3) — both are user-visible/paid-feature-breaking but fail silently.
- Add `openai-agents` to `requirements.txt`/`pyproject.toml` (Bug #4) before any fresh-environment deploy.
- Decide whether to actually delete the dead-code inventory in §7, or leave it — no functional risk either way, but it adds real cognitive overhead when navigating the repo.
- Consider whether `config/settings.py` + YAML files (§6.9) should be wired up for real, or deleted — right now they're actively misleading.
