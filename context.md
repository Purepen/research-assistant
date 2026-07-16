# Research Assistant — Project Context

_Last full codebase audit: 2026-07-15. Same-day follow-up (also 2026-07-15, see §11): most of §6.2's new findings were fixed within hours of being found, and a free-trial/BYOK product feature was added. This file is a living reference — update it when the architecture, known bugs, or dead-code inventory changes materially._

## 1. What this project is

A full-stack app that generates university-level academic research proposals ("specifications") through a 7-phase AI pipeline. A student fills in a form (field of study, topic, academic level, guidelines document, optional dataset/past-project uploads), and the backend runs a multi-agent pipeline that researches, synthesizes, writes, validates, reviews, and humanizes a complete research specification document (Justification, Objectives, Literature Review, Methodology, Work Plan, References, Abstract).

Built solo over ~7 months, starting from an initial ~18-hour structured build (`DEVELOPMENT_CALENDAR.md`) and evolving iteratively since. The codebase is incident-driven: several files carry changelog-style docstrings documenting real production incidents fixed in place (e.g. `locked_requirements_builder.py`'s "B5 — Signal Fix Edition" postmortem — a real econometrics project misrouted to the humanities track and scored 31/100 by an examiner because the keyword `"econometric"` was missing from a signal list; `phase5_workflow.py`'s note on a paradigm-omission bug that caused econometric/survey/systems/finance projects to be silently graded against the ML checklist).

Since the last audit, a whole "Workstream 0 — Stabilize" pass ran and fixed 7 of the previously-found bugs (see §6), added a pytest suite and CI, and shipped three real content-quality/cost features: CrossRef-verified citations, de-templated ethics/positionality prose, and targeted (partial) section regeneration on review failure. New issues were also found in this pass — see §6.2 and §6.3.

## 2. Tech stack

**Backend:** FastAPI, SQLAlchemy ORM over SQLite (`research_assistant.db`), Pydantic models, **OpenAI Agents SDK** (`openai-agents==0.3.3`, now correctly pinned in `pyproject.toml`) for all AI agent orchestration, `python-docx`/`openpyxl`/`pandas` for document/dataset parsing, Resend for transactional email, CrossRef's public REST API for DOI verification (new), `uv` for dependency management. `alembic==1.13.1` is a pinned dependency with **no actual migrations** — dead/aspirational (see §6.3).

**Frontend:** Next.js 14.2 (App Router, fully client-rendered — every interactive page is `'use client'`), React 18.2, TypeScript 5.3 (strict), Zustand (+ `persist`) for auth state, TanStack React Query v5 for server state, axios, Tailwind CSS 3.4 (used inconsistently — see §10), Framer Motion, `lucide-react`. `react-hook-form` (previously an unused dependency) has been removed. Both `tsc --noEmit` and `next build` are confirmed green as of this audit.

**Auth:** JWT (HS256, 24h expiry, fail-fast on a missing/short secret) + Google OAuth (server-side ID token verification — **but see §6.2 for a live audience-check gap**). BYOK: users can supply their own OpenAI API key (now encrypted at rest with Fernet) and choose per-agent model tiers.

**Testing/CI (new since last audit):** `backend/tests/` has 11 files (auth, auth-config fail-fast, crypto round-trips, BYOK factories, project lifecycle, spec validator, track/paradigm detection, locked requirements, cost controls, integrity fixes, and a "golden harness" `test_pipeline_wiring.py` that monkeypatches `agents.Runner.run` so the whole pipeline can be exercised with zero network/LLM calls). GitHub Actions CI runs backend (`uv sync`, ruff, pytest) and frontend (`tsc --noEmit`, `next build`). Frontend has **zero** automated tests (no `.test.ts(x)`, no `__tests__`).

## 3. Repository layout

```
research-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS (explicit origin allowlist), router mounting
│   │   ├── api/routes/             # auth, research, projects, topics, user
│   │   ├── api/dependencies.py     # get_current_user, DB session, create_all() at import time
│   │   ├── services/               # auth_service, research_service, storage_service
│   │   ├── models/                 # SQLAlchemy (database.py) + Pydantic schemas
│   │   ├── adapters/                # email (Resend), storage (local/S3 — S3 path still broken, §6.2)
│   │   ├── core/crypto.py           # Fernet secret cipher for BYOK keys (new)
│   │   ├── core/agents/definitions/ # Agent(...) objects per phase (phase0-6, post)
│   │   ├── core/agents/instructions/# prompt strings per agent
│   │   ├── core/pipelines/          # the actual orchestration logic per phase
│   │   ├── core/domain/project.py   # ProjectLifecycle — live for phase-description text only, its
│   │   │                            #   state-machine/validation methods are otherwise unused (§7)
│   │   └── core/validation/         # spec_validator.py — zero-AI hard gate + novelty/staleness warning
│   ├── migrate.py                   # ad-hoc DB migrations (no Alembic despite it being a dependency);
│   │                                #   hardcoded to local sqlite, ignores DATABASE_URL
│   ├── scripts/encrypt_existing_keys.py  # one-time BYOK-key encryption migration, idempotent
│   ├── tests/                       # 11 files, pytest — see §2
│   └── pyproject.toml                # single source of truth for deps (requirements.txt is generated)
├── frontend/
│   └── src/
│       ├── app/                     # Next.js pages (landing, auth, dashboard/*) — 4 incompatible
│       │                            #   visual themes coexist, see §10
│       ├── components/              # landing/, ui/ (fully dead, §10), generate/ (2 of 7 files live)
│       ├── hooks/                   # useAuth, useProjects, useTopics, useUser
│       └── lib/api.ts, types/index.ts   # types/index.ts is ~90% dead weight, see §6.3
├── test_backend.py                  # manual smoke-test script, root level (out of scope for this audit)
├── generate_pdf.py                  # unrelated dev utility (FPDF project-tree export)
├── roadmap.md                       # approved AWS-serverless relaunch plan, written 2026-07-10
└── context.md                       # this file
```

## 4. The AI pipeline (core feature)

Orchestration is **plain Python**, not the Agents SDK's handoff/tool-calling graph. Every agent is a simple `Agent(name, instructions, model, tools, output_type)`; pipeline code in `core/pipelines/*.py` calls `await Runner.run(starting_agent=agent, input=...)` and stitches results together itself. The Phase 4 `specification_orchestrator` prompt still contains vestigial "hand off to X agent" language that was never wired up and is unreachable in the live call path (`locked` is never `None`, see §7).

No retry/backoff exists anywhere for `Runner.run()` calls, and no explicit timeout is set on any of them (the only HTTP call with an explicit timeout is the new CrossRef check, 6s). Failure behavior is inconsistent by design: per-item loops (web search queries, user-dump analysis, auto-discovered-project analysis) catch-print-continue on a single bad item; the 7 Phase 3 specialists and the Phase 4/5 calls catch-print-**raise**, aborting the entire multi-minute, multi-dollar generation with no checkpointing between review iterations — a failure on the last iteration of a 3-iteration loop loses the spend on the earlier iterations too. Phase 6 (critic/humanizer) is the one deliberately fail-soft phase: it never aborts the run.

### Phase 0 — Guidelines & Topic (`phase0_workflow.py`, `phase0_topic_discovery_workflow.py`)
Unchanged. `guidelines_parser_agent` parses an uploaded `.docx`, falling back to `_DEFAULT_GUIDELINES`. The separate Topic Lab engine (own frontend flow at `/dashboard/topics`) still isn't part of `main_pipeline.py`'s direct path. **Phase 0 has zero BYOK/model-tier support** — `phase0_agents.py` has no `build_phase0_agents()` factory and no `AgentModelConfig` import at all; all 8 agents are hardcoded `gpt-4o-mini`/`gpt-4o` regardless of what tier a user has selected. `dataset_profiler.py` is unchanged (pure pandas, no LLM).

### Phase 1 — Resource Discovery (`phase1_workflow.py`, `phase1_paper_fetcher.py`)
Same 3-stream structure (web / citation-verification / user-uploads+auto-discovery), now tier-aware (`build_phase1_agents()` exists and is called with no try/except swallow — Bug #2 from the last audit is genuinely fixed here).

**New: CrossRef DOI verification** (`phase1_paper_fetcher.py:24-66,129-141`). Every paper the fetcher agent returns is checked against `https://api.crossref.org/works/{doi}` (6s timeout, no API key). A DOI that resolves `404` gets the paper **dropped** from the citation pool entirely; a network failure/timeout is classified `"unreachable"` and does *not* drop the paper (deliberately, so a CrossRef outage doesn't punish the student) — the new `VerifiedPaper.doi_verified` field records which. Only DOI *existence* is independently confirmed; title/abstract/metrics are still the fetch agent's self-report. `paper_abstract_fetcher_agent` itself remains hardcoded `gpt-4o-mini` with no tier config, despite `AgentKey.PAPER_FETCHER` existing in the model-tier registry — a user picking a different model for this agent in Custom tier has no effect.

Track detection (`detect_track()`) is unchanged — same keyword-heuristic Track A/B split, same class of fragility the B5 incident exposed (any of the other keyword-signal lists could have the same missing-synonym failure mode).

### Phase 2 — Strategic Synthesis (`phase2_workflow.py`)
Unchanged synthesis logic. Now tier-aware via `build_phase2_agents()`, **but** the call site wraps it in a try/except that silently falls back to default models on any failure (`phase2_workflow.py:76-85`) — this is the same shape of bug as the old Bug #2 (a paying user's tier silently doesn't apply), just not yet fixed for this one phase. The rest of the codebase has an explicit no-swallow policy for exactly this reason (comments in `phase1_workflow.py`, `phase3_workflow.py`, `phase6_humanizer_critic.py` all say some version of "no try/except here — silently downgrading was Bug #2/#12").

### Locked Requirements (pre-Phase-3, `locked_requirements_builder.py`)
Still the "ground truth" freeze object. Two things worth flagging:
- **De-hotplated ethics/positionality text.** Previously `EthicsStatement.statement`/positionality text were finished, reusable paragraphs — meaning every project sharing a `data_sensitivity` level (or field, for positionality) got byte-identical prose pasted into their methodology section, a real plagiarism/originality risk across a cohort of students using the app. Now these are short factual briefs (<60 words), and the Phase 3 prompts explicitly instruct "write 2-4 sentences of ORIGINAL prose from these facts... do not reuse stock phrasing" (`phase3_workflow.py:429-433,466-469`).
- **`treatment_variable`/`outcome_variable`/`control_variables` are declared, read, and instructed-upon, but never actually populated.** `LockedRequirementsA` declares them, `phase3_methodology.py:134` tells the writer to "use those exactly" if present — but `build_locked_requirements()` never sets any of the three for the `ECONOMETRIC_CAUSAL` paradigm. Every econometric spec silently falls back to generic "to be specified by student with supervisor" placeholders regardless of what the student actually entered.

### Phase 3 — Section Specialists (`phase3_workflow.py` + `phase3_agents.py`)
Still 7 sequential agents (justification, objectives, literature, methodology, work-plan/timeline, references, abstract), still `gpt-4o-mini` across the board — including the abstract specialist, despite a stale code comment ("everything gpt-4o except the last") that predates the cost-tier downgrade and was never updated.

**New: targeted regeneration.** `generate_specification_sections()` now accepts `previous_sections`/`sections_to_regenerate`/`section_feedback`. On iteration 1 all 7 sections generate; on iteration ≥2, `select_sections_for_regeneration()` (`phase5_workflow.py:93-205`) computes which sections actually need rewriting — any section scoring below 75% of possible marks, plus sections implicated by validator blockers (unattributable blockers widen to all 5 content sections rather than being silently dropped). Everything else is copied verbatim from the previous iteration. References and Abstract always regenerate if *any* content section changed, since they aggregate the others. If no failing section can be identified at all, the code falls back to full regeneration rather than resubmitting an unchanged document. This meaningfully cuts iteration cost and was verified end-to-end by `test_cost_controls.py` (methodology regenerated twice in a 2-iteration run, the four untouched sections called once).

### Phase 4 — Formatting (`phase4_workflow.py` + `phase4_agents.py`)
Unchanged behavior. Now tier-aware, but via inline `_get_formatter_agent()`/`_get_orchestrator_agent()` helpers in the workflow file rather than a `build_phase4_agents()` factory in the definitions module — functionally fine, but inconsistent with `agent_config.py`'s own documented invariant that "every agent definition file exposes a factory function `build_<phase>_agents`" (false for phases 0, 4, and 5). The legacy `specification_orchestrator` path remains dead/unreachable — `locked` is never `None` in the real call path.

### Phase 5 — Review Loop (`phase5_workflow.py` + `phase5_agents.py` + `spec_validator.py`)
Same validate → review → loop-on-rejection → best-iteration-wins structure. Reviewer model selection is another inline clone (`_get_reviewer_agent()`), not a definitions-level factory, mirroring Phase 4's pattern.

**Fixed in this pass: paradigm was never passed into validation.** Both call sites to `validate_specification()` previously omitted `paradigm` entirely, meaning every non-ML-classification project (econometric, survey, systems, finance) was silently graded against the ML-specific blocker checklist. `_resolve_paradigm()` now fixes this.

**New: novelty/staleness gate** (`spec_validator.py:144-223`). Computes Jaccard similarity between the generated title and each prior/similar project's title (threshold 0.6); above threshold, checks whether the spec text mentions that prior project's author surname as a differentiation proxy. **This is a warning only, never a blocker** — `passes_all` is computed purely from the blocker list, so a staleness warning can never fail validation or force regeneration on its own; it's just surfaced to the reviewer agent as context. The author-mention check is a weak proxy by its own admission (a stray name-drop suppresses the warning; a real differentiation paragraph that doesn't name the author triggers a false one) — acceptable for a warning-only signal, not for anything load-bearing.

**Known stopgap:** the citation-count floor was deliberately lowered from 15 to 10 with an explicit unresolved TODO (`spec_validator.py:514` — *"Raise back to 15 once PaperAbstractFetcher reliably returns 15+ papers"*) because the fetch pipeline under-delivers; this threshold exists in two places that must be kept in sync by hand.

### Phase 6 — Post-processing (`phase6_humanizer_critic.py`)
Unchanged: `critic_agent` (brutal gap analysis, non-fatal on failure) → `human_writer_agent` (rewrites prose sections to sound human, reverts per-section if a rewrite comes back under 40% of original length). Now tier-aware via `build_post_agents()`, with no swallow (this is literally the fix for the previously-found Bug #12). `phase6_agents.py`'s `email_agent` remains defined and registered but is still never called at runtime — real email delivery is `email_adapter.py`'s sync Resend call from `research_service.py`, no LLM involved.

### Model-tier / BYOK layer (cross-cutting)
Tier-build factory coverage, checked directly per phase:

| Phase | Factory? | Notes |
|---|---|---|
| 0 | **No** | Zero tier awareness at all |
| 1 | Yes, no swallow | Fixed (was Bug #2) |
| 2 | Yes, **but swallowed** | Silently falls back on error — same failure mode as old Bug #2 |
| 3 | Yes, no swallow | Fixed (was Bug #2) |
| 4 | Inline clone, not a factory | Works, but undiscoverable/inconsistent |
| 5 | Inline clone, not a factory | Works, but undiscoverable/inconsistent |
| 6 (email) | N/A | Agent unused at runtime |
| post (critic/humanizer) | Yes, no swallow | Fixed (was Bug #12) |

**`REQUIRE_BYOK` guard exists but is wired to the wrong place.** `app/utils/openai_key.py`'s `apply_openai_key()`/`_require_byok()` correctly raises if a deployment sets `REQUIRE_BYOK=true` and a user has no key of their own — but it is called **only** from the 5 Topic Lab endpoints in `routes/topics.py`. `research_service.py` (the actual paid full-specification-generation path — the expensive one) has its own, separate key-resolution block (lines 109-156) that never imports `apply_openai_key` and never checks `REQUIRE_BYOK` at all; it falls straight through to the system `OPENAI_API_KEY` env var if the user has none. **Net effect: `REQUIRE_BYOK=true` protects the cheap topic-discovery calls but does nothing to stop the expensive generation pipeline from running on the owner's key** — the one place this guard matters most economically is the one place it isn't enforced. No test exercises this path under `REQUIRE_BYOK=true` either.

### End-to-end data flow
Unchanged from the prior audit (see `main_pipeline.py`); the additions above (CrossRef verification, de-hotplated ethics text, targeted regeneration, novelty gate) slot into the same overall shape without changing the phase sequence.

## 5. Domain models

Unchanged real/live schemas (`app/models/*.py`), plus: `VerifiedPaper` (`locked_requirements.py`) gained a `doi_verified: bool` field. `LockedRequirementsA`'s `treatment_variable`/`outcome_variable`/`control_variables` fields exist in the schema but are never populated (§4).

Dead/unused parallel layer: only `core/domain/project.py` remains in `core/domain/`, and even that file is mostly dead — see §7.

## 6. Known bugs

### 6.1 — Fixed since 2026-07-10 (verified, not assumed)
1. `GET /projects/{id}` "Unknown" phase — fixed. `ProjectLifecycle._coerce()` now normalizes any enum via `.value` before lookup.
2. BYOK model-tier no-op for Phase 1/3 — fixed. Factories exist, swallow removed. **(Phase 2 has since regressed into the same failure mode independently — see §6.2.)**
3. `useAuth.ts` importing unexported `User` — fixed. `types/index.ts` exports it; build confirmed green (`tsc --noEmit` and `next build` both pass as of this audit).
4. `openai-agents` missing from manifests — fixed. Pinned in `pyproject.toml`; `requirements.txt` is now `uv export` output, consistent.
5. BYOK key stored in plaintext — fixed. `core/crypto.py`'s `FernetCipher` (fail-fast on missing/invalid `FERNET_KEY`) encrypts on every write path and decrypts on every read path; a migration script exists and is idempotent. One latent nit: `migrate.py`'s raw `ALTER TABLE` declares the column `VARCHAR(255)` while the SQLAlchemy model declares `Text` — harmless on SQLite, would truncate a Fernet token on Postgres.
6. `JWT_SECRET_KEY` insecure fallback — fixed. Fails fast at import time if unset or under 32 chars, no fallback string.
7. Phase-6 naming collision — fixed. Dead `phase6_workflow.py` deleted.
8. Full dead-code inventory (backend `auth.py.backup`, `models/user.py`, `core/domain/{research_spec,review,specification}.py`, `config/settings.py`+yaml, `adapters/openai_adapter.py`; frontend dead `generate`/`results` components, duplicate `Sidebar.tsx`/`useAuth.ts`, `react-hook-form`) — confirmed physically deleted, not just unreferenced. No re-additions since.

### 6.2 — New findings this pass (2026-07-15), verified against live code
1. **`POST /research/cancel/{id}` is worse than "cosmetic" — a cancelled project can be silently resurrected to COMPLETE.** It only sets `project.status = FAILED` (`research.py:304-306`); there is no task registry mapping `project_id → asyncio.Task`, so the fire-and-forget `background_tasks.add_task()` generation keeps running. Confirmed: `research_service.py:184` unconditionally sets `project.status = ProjectStatus.COMPLETE` when the pipeline finishes, with **no check for whether the status was already flipped to `FAILED` in between** — so a user who cancels mid-generation can see their project flip back to "complete" minutes later, and the full OpenAI spend happens regardless. Notable given the most recent pipeline commit is literally titled "cost controls."
2. **`REQUIRE_BYOK` doesn't protect the expensive path.** See §4 — wired into Topic Lab only, not `research_service.py`. Confirmed via direct grep: zero references to `apply_openai_key`/`REQUIRE_BYOK` in `research_service.py`.
3. **Google OAuth accepts tokens issued for *any* Google client if `GOOGLE_CLIENT_ID` is unset.** `auth_service.py:43` reads `GOOGLE_CLIENT_ID` with no presence/format check (unlike `JWT_SECRET_KEY`/`FERNET_KEY`, which both fail fast); it's passed straight through as `audience` to `id_token.verify_oauth2_token()` (`auth_service.py:233-237`). Google's library skips the audience check entirely when `audience=None`. A misconfigured deployment (env var simply not set) silently accepts a validly-signed ID token from an unrelated Google OAuth client as a valid login here.
4. **S3 storage is still broken end-to-end.** `storage_adapter.py`'s `_save_local()` returns a `"path"` key; `_save_s3()` returns a `"key"` key instead — confirmed directly (`storage_adapter.py:99` vs `:133`). Every consumer in `storage_service.py` unconditionally reads `result["path"]`, so flipping `STORAGE_TYPE=s3` breaks every file upload with an unhandled `KeyError`. Nothing in the test suite exercises this path.
5. **Phase 2's tier factory silently swallows failures** (§4) — reintroduces the shape of the old Bug #2 for one phase, contradicting the explicit "must see the failure" policy stated in code comments elsewhere.
6. **Phase 0 has no BYOK/tier support at all**, contradicting `agent_config.py`'s stated design invariant that every phase exposes a `build_<phase>_agents` factory.
7. **`DELETE /user/account` has no confirmation step** — a single bearer token permanently deletes the user and cascades to all their projects/topic history, no re-auth/confirmation text required.
8. **`/auth/register` leaks account existence** ("Email already registered") while `/auth/request-password-reset` deliberately gives a generic response for the same reason — inconsistent enumeration posture within the same file.
9. **No rate limiting anywhere**, despite `.env.example` declaring `RATE_LIMIT_PER_MINUTE=60` — confirmed zero hits for `slowapi`/`Limiter`/rate-limit logic repo-wide. Every route ultimately gates on paid OpenAI calls; this is a real cost/abuse exposure, not just a style nit.
10. **No real migrations** — `alembic` is a pinned, unused dependency; `Base.metadata.create_all()` runs at import time (`dependencies.py:35`); `migrate.py` hand-rolls `ALTER TABLE`s and hardcodes a local SQLite path, ignoring `DATABASE_URL` (would silently migrate the wrong database if ever run against a configured Postgres instance).
11. **Two confirmed N+1 query patterns**: `projects.py`'s `list_projects` and `user.py`'s `get_user_stats` both lazy-load `Project.result` per row instead of `joinedload`.
12. **Frontend: dashboard status-color bug.** `dashboard/page.tsx:241` checks `p.status==='completed'`, but the real terminal status string used everywhere else in the app (types, other pages, hooks) is `'complete'` — the extra "d" means a genuinely completed project's status dot on the main dashboard never renders green, always falling to the amber "in progress" color. Copy-paste divergence between three separately hand-rolled status-color functions (`dashboard/page.tsx`, `projects/page.tsx`, `projects/[id]/page.tsx`) instead of one shared one.
13. **Frontend: dead/unreachable mobile navigation.** `dashboard/Header.tsx` defines a full mobile drawer, a menu icon, and `open`/`setOpen` state — but nothing ever calls `setOpen(true)`; the sidebar is a fixed 232px element with no responsive behavior at all. On a narrow viewport there is currently **no way to open navigation.**
14. **Frontend: profile page has factually wrong security copy for non-Google users.** `profile/page.tsx` hardcodes "Account Type: Google OAuth 2.0" / "Secured via Google OAuth 2.0" regardless of how the user actually registered — the app has a fully separate, first-class email/password flow, so any of those users sees an incorrect claim about their own account security on their own profile page.
15. **Frontend: stray placeholder copy shipped to production.** `dashboard/topics/page.tsx:854` renders the literal string "dropping son" as a UI label — reads like an unfinished joke/placeholder, not intentional copy.
16. **Frontend: `types/index.ts` is ~90% dead and this is *why* the previously-flagged type mismatches never surface.** 19 of 20 exported types have zero usages outside the file itself, because `lib/api.ts` never types any axios call — every response flows through as `any`. This is how `review.section_scores` (doesn't exist; real field is `section_reviews`) and `result.critic`/`result.total_marks` (don't exist on `ResultResponse`) can be read in `projects/[id]/page.tsx` without `tsc` ever catching it.
17. **Frontend: zero accessibility affordances.** No `aria-*` attributes and no `tabIndex` anywhere in `src/`; numerous `onClick` handlers live on non-semantic `<div>`/`<motion.div>` elements (dashboard spec cards, file-upload dropzones, topic-result cards) with no keyboard path to activate them.
18. **Frontend: no error boundary anywhere** — a render-time exception on any of the widely-`any`-typed data (see #16) blanks the entire dashboard route with Next's default error screen, no app-level recovery.
19. **Frontend: Topic Lab's raw-axios calls bypass the shared 401 handler.** An expired token mid-Topic-Lab-session surfaces as a generic, indefinitely-retryable error with no redirect to sign-in, unlike every other page in the app.

### 6.3 — Confirmed dead code (new, in addition to the fully-executed 2026-07-10 inventory)
**Backend:** `app/utils/deduplication.py`, `file_handlers.py`, `save_package.py` (all re-exported from `__init__.py` but zero real callers — the actual logic is reimplemented inline elsewhere); `AuthService.check_user_permission()` (zero callers; every route reimplements the same ownership filter inline instead); `core/domain/project.py`'s `validate_project_config()`, `estimate_generation_time()`, and the entire `ProjectLifecycle` transition-validation machinery (`VALID_TRANSITIONS`, `can_transition_to`, `transition_to`, `is_terminal`, `is_active`) — only `get_phase_description()` is actually called (`projects.py:117-118`); real status changes bypass lifecycle validation via direct `project.status = X` assignment throughout `research_service.py`. `phase6_agents.py`'s `email_agent` remains a dead runtime no-op, kept only as a model-tier registry key.

**Frontend:** `components/ui/Button.tsx` and `Card.tsx` (zero imports — leftover from an earlier dark/glassmorphic design pass, and ironically implement a *fifth* incompatible visual language); 19 of 20 exports in `types/index.ts` (see §6.2 #16); ~150 lines of unreachable dark-navy CSS in `globals.css` (`--dash-*` tokens, `.card-navy`, `.stat-card`, `.sidebar-link`, `.badge-*`, etc.); `tailwind.config.js`'s custom `primary` color scale and `animate-float`/`animate-glow`/`gradient-radial`/`gradient-conic` utilities (zero usages); `Header.tsx`'s `IcoMenu` icon and mobile-drawer-open path (dead, see §6.2 #13).

## 7. Enterprise/production-readiness posture (summary — see §6.2 for specifics)

- **Security:** password hashing and JWT are sound; CORS is a proper explicit allowlist (not wide open); no SQL injection surface (pure ORM); no secrets found in logs; every data route correctly filters by owning user (no IDOR found anywhere). Real gaps: the Google OAuth audience bypass (#3), no rate limiting (#9), no refresh-token rotation/revocation (a leaked JWT is valid for its full 24h with no logout-everywhere), no account-deletion confirmation (#7), general file-upload hardening (no AV/zip-bomb/XXE consideration for parsed `.docx`/`.xlsx` uploads, though extension/size checks and randomized storage filenames do prevent path traversal).
- **Reliability/observability:** no retry/backoff on any LLM call, no per-call timeouts, no checkpointing across review iterations (a late-iteration failure loses all prior spend), no rate limiting, no APM/error-tracking (no Sentry or equivalent on either side), print-statement logging throughout instead of structured logs.
- **Data layer:** no real migrations despite a pinned Alembic dependency; `create_all()` at import time; two confirmed N+1 patterns; a migration script that silently targets the wrong database under Postgres.
- **Frontend:** zero automated tests, zero accessibility affordances, no error boundary, no telemetry/analytics, four incompatible visual design systems still coexisting, ~90 duplicated hand-rolled icon components despite `lucide-react` already being a clean dependency in active use elsewhere.
- **Cost controls:** genuinely improved this pass (targeted regeneration, gpt-4o-mini defaults, CrossRef-gated citations) — but undermined by the two gaps above it (cancel doesn't stop spend; `REQUIRE_BYOK` doesn't cover the expensive path) and by having zero test coverage on either gap.

## 8. Backend API surface (reference)

- **`/auth`**: `POST /register`, `/login`, `/verify-email`, `/resend-verification`, `/request-password-reset`, `/reset-password`, `/google`, `GET /me`, `POST /refresh` (re-signs from a valid token — no rotation/revocation, no separate refresh-token concept).
- **`/research`**: `POST /generate` (multipart; file validation happens only after Starlette spools the upload), `GET /status/{id}`, `GET /result/{id}`, `POST /cancel/{id}` (cosmetic only, §6.2 #1).
- **`/projects`**: `GET /` (paginated, bounded `skip`/`limit`, but invalid `status` filter values are silently ignored rather than 422), `GET /{id}`, `DELETE /{id}`, `GET /{id}/analytics`, `GET /{id}/download` (in-memory `.docx` build).
- **`/topics`** (Topic Lab, largest/most-evolved route file, all agent-calling endpoints call `apply_openai_key()` first): `POST /discover`, `/scout`, `/refine`, `/find-projects`, `/vet`, `/vet/save`, `GET /history` (unlike `/projects/`, `skip`/`limit` here are unbounded plain ints), `POST /link-project`, `DELETE /history/{id}`. Six broad `except Exception` handlers here return raw exception text in the 500 response body — inconsistent with the sanitized-error pattern used elsewhere in the API.
- **`/user`**: `GET /profile`, `PATCH /profile`, `GET /stats`, `DELETE /account` (no confirmation step, §6.2 #7), `GET`/`PUT /settings/models` (validates tier + sanitizes custom config against known registries), `GET`/`PUT /api-key` (PUT does a live `OpenAI.models.list()` validation call before persisting the encrypted key; never returns the raw key, only a masked `sk-...{last4}` preview).

## 9. Frontend notes (reference)

- No websockets — all "live" progress is HTTP polling via React Query `refetchInterval` (`useProject` 5s, `useProjectStatus` 3s; `useProjectResult` correctly gated on `status === 'complete'`). Cache invalidation across mutations (delete, generate, cancel, link/delete topic session) is consistent and sensible.
- Auth token exists in **three** separate localStorage locations (`access_token`, `user`, and the Zustand-persisted `auth-storage` blob); the shared axios interceptor handles 401s by clearing two of the three and hard-redirecting, but Topic Lab's raw-axios calls (see §6.2 #19) never go through this interceptor at all.
- Protected routes are enforced entirely client-side (`dashboard/layout.tsx` `useEffect` redirect) — no `middleware.ts`. The page bundle is still shipped to and briefly mounted by an unauthenticated client before the redirect fires.
- Visual inconsistency has not been resolved and has grown, not shrunk: **four** incompatible design systems now coexist (landing's custom CSS, core-auth's custom green CSS, peripheral-auth's Tailwind+lucide blue/purple gradient theme, and the dashboard's custom CSS + heavy per-element inline `style={{}}`), plus a fifth, fully dead one in `components/ui/{Button,Card}.tsx`.
- ~90 duplicated hand-rolled inline SVG icon functions are spread across 9 files (`signin`, `register`, `Header`, `Sidebar`, `dashboard/page`, `projects/page`, `projects/[id]/page`, `topics/page`, `profile/page`) despite `lucide-react` already being used cleanly elsewhere in the same app.
- Topic Lab (`dashboard/topics/page.tsx`, now ~1160 lines, up from ~1000) still bypasses `lib/api.ts` entirely via raw `axios` calls and its own `authHeaders()` helper, and additionally uses **zero** React Query — the only major data-fetching surface in the app not benefiting from the caching/retry pattern used everywhere else.
- `alert()`/`confirm()` (browser-native) are used for download failures and destructive-action confirmation instead of the app's own visual language — no toast library or shared alert component exists.

## 10. Recommended next steps

Roughly in priority order given what's now confirmed:
1. **Cost/security leaks that contradict the app's own stated goals** — fix `research_service.py` so cancellation actually stops the background task (or at minimum stops it from overwriting `FAILED` back to `COMPLETE`), and wire `REQUIRE_BYOK`/`apply_openai_key` into the generation path, not just Topic Lab.
2. **Google OAuth audience fail-fast** — apply the same "fail fast if unset" treatment already given to `JWT_SECRET_KEY`/`FERNET_KEY` to `GOOGLE_CLIENT_ID`, since a silently-unset value currently disables the audience check rather than disabling the login method.
3. **Fix or remove S3 storage** — either make `_save_s3` return `"path"` (aliased to the S3 key) so existing consumers work, or explicitly gate `STORAGE_TYPE=s3` behind a "not yet supported" error rather than letting it fail with a raw `KeyError`.
4. **Phase 2's silent tier-fallback** — remove the try/except swallow to match the policy already applied to Phases 1/3/post.
5. **Frontend dashboard status-color bug** — one-character fix (`'completed'` → `'complete'`), plus consider consolidating the three duplicated status-color functions into one shared helper so this class of bug can't recur.
6. **Give `lib/api.ts` real generics** so `types/index.ts` stops being ~90% dead weight and actual response-shape mismatches (`section_scores`/`section_reviews`, `result.critic`) start surfacing at compile time instead of silently reading `undefined` at runtime.
7. **Decide on rate limiting** before any real traffic — the `.env.example` variable is currently aspirational with zero enforcement, and every route gates on paid OpenAI calls.
8. **Either wire up Alembic for real or drop it** — right now it's a dependency that implies a migration story that doesn't exist; fix `migrate.py` to honor `DATABASE_URL` regardless.
9. Smaller, low-risk cleanups: delete the newly-confirmed dead code in §6.3; fix the "dropping son" stray string and the Google-only profile copy; wire up or delete the dead mobile-nav menu; consolidate the ~90 duplicated icon components onto `lucide-react`.

## 11. Same-day follow-up (2026-07-15) — fixes applied + new free-trial feature

Most of §6.2's findings were fixed the same day they were found (full test suite green throughout, 103→112 tests as trial tests were added; both `tsc --noEmit` and `next build` stay green).

**Fixed:**
- **§6.2 #1 (cancel resurrection)** — `/research/generate` now launches generation via `asyncio.create_task` (not FastAPI's `BackgroundTasks`) and keeps the task in an in-process registry (`research.py`'s `_RUNNING_GENERATIONS`); `/cancel` calls `task.cancel()` on it after writing `FAILED`. `research_service.py` additionally re-reads (`db_session.refresh`) the project's status right before the unconditional `COMPLETE` write and bails out if it's already `FAILED`, so even a timing gap can't resurrect a cancelled run. This is explicitly a single-process stopgap — real cancellation in the cloud build is Step Functions `StopExecution` per roadmap.md WS1.
- **§6.2 #3 (Google OAuth audience bypass)** — `verify_google_token()` now refuses (returns `None`, same as any other verification failure) when `GOOGLE_CLIENT_ID` is unset, instead of passing `audience=None` into `verify_oauth2_token` and silently skipping the audience check.
- **§4/§6.2 #2 (Phase 2 tier swallow + REQUIRE_BYOK not covering the paid path)** — both fixed together. `phase2_workflow.py` dropped its try/except (matches Phase 1/3/post's no-swallow policy). `research_service.py` no longer has its own independent key-resolution block — it now calls the same `apply_openai_key()` helper Topic Lab uses, so `REQUIRE_BYOK` (and the new free-trial gate below) apply uniformly to every OpenAI-calling path, not just Topic Lab.
- **§6.2 #4 (S3 `"path"`/`"key"` mismatch)** — `_save_s3()` now also returns `"path": key`, so the immediate `KeyError` is gone. Note: this does **not** make S3 storage fully functional end-to-end — pipeline consumers (`Document(path)`, `_read_file_text`, `profile_dataset`) still open the return value as a local filesystem path, which a bare S3 key isn't. Full support needs the `download_to_tmp()` plumbing roadmap.md's WS1.4 already scopes; deferred until the deployment work below reaches that point.
- **Frontend:** dashboard status-dot typo (`'completed'`→`'complete'`); dead mobile-nav menu is now wired up and actually shows the nav links (previously the drawer rendered with no menu items even if opened) with a responsive breakpoint (`dashboard.css`, 860px) that hides the fixed sidebar in favor of the hamburger+drawer; "dropping son" stray placeholder → "Coming soon"; profile page's hardcoded "Google OAuth 2.0" copy is now conditional on a new `auth_provider` field (`"google"` | `"email"`) returned by `/auth/login`, `/auth/google`, and `/auth/me`.

**Deliberately not fixed yet (need a bigger decision, not a quick patch):**
- `types/index.ts`/`lib/api.ts` typing gap (§6.2 #16) — holding per explicit request pending a decision on whether to type the API client for real or delete the dead exports.
- Full S3 plumbing, rate limiting, Alembic migrations, N+1 query fixes, refresh-token rotation — unchanged, still open. These fold into the roadmap.md WS1/WS2 work now underway (see roadmap.md and the session this was fixed in for current status).

### Free-trial / BYOK product feature (new)

Per product decision: a user with **no OpenAI key of their own** gets exactly **one free Topic Lab action** (whichever of discover/scout/refine/vet/find-projects they call first — a single shared credit, not five separate ones) and **one free full specification generation**, both running on the shared system key. Once a credit is spent, that action requires the user's own key. Users who've added their own key are **never** gated by this — it's their own spend.

- **New module `app/services/trial_service.py`**: `consume_free_credit(user, db_session, kind)` (`kind` = `"topic"` | `"spec"`), raises `FreeTrialExhausted` (a `RuntimeError` subclass) without mutating anything if already spent.
- **New `User` columns** (`app/models/database.py`, migrated via `migrate.py`): `free_topic_credit_used`, `free_spec_credit_used` (booleans, default false).
- **`app/utils/openai_key.py`'s `apply_openai_key()`** is now the single chokepoint for this: returns `bool` (was the user's own key used?), takes optional `db_session`/`credit_kind` to enable trial gating. Priority order: user's own key (unconditional) → `REQUIRE_BYOK` hard block → free-trial credit check/consume → system key. Called from all 5 Topic Lab routes (`credit_kind="topic"`) and from `research_service.py` (`credit_kind="spec"`); both surface exhaustion as a clean 402 (Topic Lab) or a `FAILED` project with a clear error message (generation).
- **`migrate.py`** now reads `DATABASE_URL` (falls back to the local SQLite file) instead of always targeting local SQLite regardless of configuration — was silently pointing at the wrong database under a configured Postgres deployment.
- **Frontend**: `/user/stats` now also returns `has_own_api_key`/`free_topic_credit_used`/`free_spec_credit_used`; the sidebar's usage panel now shows real trial-credit status ("Available"/"Used" per credit, with a prompt to add a key once exhausted) instead of a hardcoded, never-enforced "X/3 specs" meter.
- Tests: `backend/tests/test_free_trial.py` (9 tests) — credit consumption/persistence, independence of the two credit kinds, `apply_openai_key`'s full priority order, `REQUIRE_BYOK` still takes precedence over an available credit.

## 12. Deployment (in progress — see roadmap.md "Workstream 0.5 — Quick Deploy" for full detail)

Decision (revised from an earlier "follow roadmap.md in order" choice, then reconsidered same session): ship a fast "v1 showcase" deploy of the *existing* app now — ECS Fargate ×2 (backend + frontend, each with its own ALB) + Aurora Serverless v2 Postgres + S3 + ECR + Secrets Manager, all Terraform-managed — while the full serverless rebuild (this file's earlier-described roadmap WS1/WS2) continues as a parallel, not-abandoned track. The v1 infra deliberately reuses what WS1/WS2 need anyway (VPC, Aurora, S3, secrets), so it isn't wasted work once the compute layer swaps from ECS to Lambda/Step Functions later.

**Built and verified this session:**
- `infra/` — Terraform for network/security/database/storage/ecr + one reusable `service` module (ECS Fargate + ALB + IAM + logs) used for both backend and frontend. `terraform validate` passes.
- `backend/Dockerfile`, `frontend/Dockerfile` — both images built *and* smoke-tested locally before touching AWS (backend `/health` → 200 in a real container; frontend serves real HTML/CSS/JS). Backend takes ~20s to boot (pandas/openai-agents imports) — accounted for via `health_check_grace_period_seconds`.
- `psycopg2-binary` added to `backend/pyproject.toml` — there was no Postgres driver at all before this; SQLite never needed one, so the gap was invisible until a real Postgres target existed.
- `infra/README.md` (runbook) and `infra/scripts/deploy.sh` (build/push/redeploy automation for future code changes).

**Known v1-only limitations (not bugs — see roadmap.md WS0.5 for the full list):** file uploads still use local container storage, not the newly-created S3 bucket (S3 `download_to_tmp()` plumbing is still WS1.4, not done); Resend needs a verified sending domain before arbitrary strangers (not just the account owner) can receive verification emails; Google OAuth consent screen likely needs flipping from "Testing" to "In production" in Google Cloud Console before arbitrary Google accounts can sign in. (HTTPS/custom-domain is no longer a limitation — see the 2026-07-16 update below.)

**Status as of 2026-07-15:** AWS account + IAM user (`aiengineer`, `AdministratorAccess`) created, credentials configured and verified locally, Terraform/AWS CLI installed, `terraform init`/`validate` clean, `terraform.tfvars` filled in. **Not yet applied.** Next: `terraform plan` → review → `terraform apply` → build/push images → verify live.

**Process note for future sessions:** for cloud/Terraform/AWS work specifically, the user runs every command themselves (to learn the material) — Claude explains and reviews output rather than executing. This is scoped to cloud/infra only; it doesn't apply to application-code changes, where "just do everything necessary" (per earlier this session) still holds.

### 2026-07-16 update — applied, hit and fixed two real deploy bugs, added a CloudFront edge

`terraform apply` ran for real against a live AWS account (963947738981, us-east-1) — all 62 resources came up: VPC/NAT, Aurora cluster, ECR, Secrets Manager, S3 bucket, and both ECS services + ALBs. Two issues surfaced only once real infra existed, both fixed same-day:

1. **Aurora rejected `engine_version = "15.4"`** (not an offered Aurora PostgreSQL version in this account/region) — bumped to `15.17` in `infra/modules/database/main.tf`; cluster came up clean on the retry.
2. **Google sign-in failed with `Error 400: origin_mismatch`.** Root cause: Google Identity Services (the `google.accounts.id` popup flow this app actually uses — see `signin/page.tsx:107-119`, no redirect-based OAuth anywhere) flatly refuses to register a non-`localhost` **`http://`** origin — confirmed against Google's own docs, not assumed. The frontend was only reachable over the frontend ALB's plain-HTTP DNS name, so there was no config fix available short of getting real HTTPS in front of it.

**Fix: new `infra/modules/cdn` module** — one CloudFront distribution in front of both ALBs (path-based: the existing backend route prefixes — `/auth/*`, `/research/*`, `/projects/*`, `/user/*`, `/topics/*`, `/health`, `/docs`, `/redoc`, `/openapi.json` — go to the backend origin, everything else to the frontend origin). Chosen over buying a domain + ACM + Route53 specifically for zero cost/setup — CloudFront's own `*.cloudfront.net` domain already carries a valid cert. One distribution for both services also makes frontend and API same-origin from the browser's perspective, so there's no cross-origin/CORS concern between them either. New `app_url` Terraform output (`https://d36rkudb31binq.cloudfront.net`) is now the one canonical URL — it's what's registered in Google Cloud Console's Authorized JavaScript origins, what `NEXT_PUBLIC_API_URL`/`FRONTEND_URL` are built against, and what `deploy.sh frontend` bakes into the image.

Caching is deliberately **disabled on every path** (`Managed-CachingDisabled`) — both the Next.js app and the whole API are dynamic/auth-gated, so this distribution is currently acting as a pure TLS-terminating reverse proxy, not a cache. See "CloudFront implications" note below for what that trades away and what to watch for.

**Verified working:** Google sign-in end-to-end through the new `app_url` (the `origin_mismatch` error is gone). **Not yet verified:** the rest of the app's features through the new domain — full spec-generation pipeline, Topic Lab, file uploads (a real risk — CloudFront enforces a viewer-request body-size ceiling the direct-to-ALB path never had; large guidelines/dataset uploads need an explicit test, not an assumption), email verification links, download endpoint.

**CloudFront implications worth flagging for later:**
- **Origin traffic is plain HTTP, not end-to-end TLS.** CloudFront terminates HTTPS at the edge, then talks to both ALBs over `http-only` — encrypted browser-to-edge, unencrypted edge-to-origin (stays inside AWS's network, a common and generally accepted pattern, but not full end-to-end encryption).
- **The raw ALB URLs are still directly reachable**, in parallel to `app_url`, over plain HTTP with no caching/edge in front — nothing currently forces all traffic through CloudFront. Locking the ALBs' security groups to CloudFront's managed IP prefix list would close this if it matters later.
- **New backend route prefixes must be added to `local.backend_path_patterns`** in `infra/modules/cdn/main.tf` by hand, or requests to them will silently fall through to the frontend origin (404, not an obvious "you forgot the CDN" error).
- **A future custom domain needs its ACM cert issued in `us-east-1` specifically**, regardless of which region the rest of the infra lives in — CloudFront only accepts certs from that region.
- Any edit to the CDN module takes several minutes to propagate globally after `terraform apply` — already observed once, expected on every future distribution change.

**Fix (applied and verified):** new `infra/modules/cdn` — one CloudFront distribution in front of both ALBs, path-routed (`/auth/*`, `/research/*`, `/projects/*`, `/user/*`, `/topics/*`, `/health`, `/docs`, `/redoc`, `/openapi.json` → backend origin; everything else → frontend origin), using CloudFront's own `*.cloudfront.net` cert (no domain purchase, no ACM). New `app_url` output is the app's canonical HTTPS entry point (https://d36rkudb31binq.cloudfront.net). Backend's `FRONTEND_URL` env var now points at `app_url` instead of the frontend ALB directly. `deploy.sh`/README's frontend build step now bakes `NEXT_PUBLIC_API_URL=$APP_URL` instead of the raw backend ALB URL — same origin serves both, so there's no CORS to manage between them either. Caching is disabled on every behavior for now (both apps are fully dynamic/auth-gated) — this is purely an HTTPS terminator today, not a cache. The user ran `terraform apply`, registered `app_url` in Google Cloud Console's Authorized JavaScript origins, redeployed the frontend via `deploy.sh frontend`, and **confirmed Google sign-in works end-to-end through the new URL** — including on a real Android phone. Flagged risk still open: CloudFront's request-body-size cap on viewer requests could reject a large `.docx`/`.xlsx` upload that worked fine direct-to-ALB (untested; the fix if so is direct-to-S3 uploads, already the WS1.4 direction). Also flagged: `terraform destroy` takes the CloudFront distribution with it, so the Google-authorized origin has to be re-registered after every destroy/recreate cycle, not just the first time.

**Separately raised, not yet acted on:** (1) whether non-Google-phone users (e.g. iOS/Safari) can complete Google sign-in — yes, it's the web GSI flow, no Gmail app/Android/Play Services needed, just a Google account and a browser; Safari's stricter popup/cookie blocking (ITP) is the one thing worth testing specifically once HTTPS is live. (2) Clerk as a possible replacement for the hand-rolled JWT+bcrypt+Google-verification auth stack — would also solve "Sign in with Apple" for iOS users as a first-class toggle, and Clerk's free tier was raised to 50,000 MRU (monthly *retained* users, not MAU) in a Feb 2026 pricing change; exact paid-tier numbers found via search were inconsistent across sources and weren't verified against clerk.com/pricing directly. Would be a real migration (existing bcrypt password hashes don't transfer, every route's auth dependency gets rewired), not a drop-in — worth a dedicated evaluation later if broader auth-provider flexibility becomes a priority, not forced by the Google-origin fix above.

## 13. Frontend redesign implementation (2026-07-16, same session as the CloudFront work)

Two design documents were produced first (`design/mobile-redesign-proposal.pdf`, `design/frontend-redesign-proposal.pdf` — HTML sources in `design/src/`), then implemented in phases, all verified with `tsc --noEmit` + `next build` green and headless-Chrome screenshots of the unauthenticated pages:

- **Unified design system:** `globals.css` rewritten — green/ink token set (`--green #16a34a`, `--ink #0f1f0f`, Fraunces display / DM Sans UI / Sora wordmark-only), old dead blue/navy theme (~280 lines) deleted, body font now DM Sans. Peripheral auth pages (verify-email, forgot/reset-password) recolored from the stray blue/purple Tailwind theme to green.
- **Landing:** stats replaced with honest numbers (73 specs generated, 7 phases, 15+ verified sources, £0 first spec); pricing reduced to a single Free card (1 free spec + 1 free Topic Lab session) + BYOK explainer panel; **all fabricated trust content removed** ("Trusted by students at Oxford/UCL…" softened to "Built for students at universities like", fake Trustpilot/Google/Sitejabber ratings + "4,500+ verified reviews" + five invented named students replaced by an honest use-cases section built on the real paradigm tracks). Mobile overflow fixed (≤480px block in landing.css; h1 `<br>`s + nav width were the culprits).
- **Dashboard shell:** sidebar is now dark forest (`surface-forest` class, dot grid + glow, green active pills, purple accent removed); mobile navigation is a bottom tab bar (`TabBar.tsx`: Home/Projects/center-FAB-Generate/Topics/Profile) replacing the deleted hamburger+drawer; `dashboard.css` has the tab bar + responsive rules (860px breakpoint, main bottom padding for the bar).
- **Generate wizard:** removed a `* { font-family }` override that was defeating the global font; added a cost-upfront card on the Configure step (uses `useUserStats` — own key / free credit / credit-used warning states); targeted-regeneration explainer on the iterations control; mobile CSS (hidden step labels, sticky footer nav above the tab bar, track cards stack).
- **Spec reader:** sticky right rail (score/info/download) that collapses to top-of-page on mobile (the 2-col grid previously never collapsed); manuscript typography bump; browser `confirm()` replaced with an inline two-tap delete confirm.
- **Topic Lab (partial split):** all 6 raw-axios calls migrated to the shared `lib/api.ts` client (fixes §6.2 #19 — expired sessions now redirect to /signin) with a 5-min per-request timeout for the LLM calls; `?flow=vet` / `?flow=discover` deep-link entry points added. **Still open:** physically splitting the 1,160-line page into per-tool routes and adopting React Query for its data fetching.

**Deploy note:** frontend-only changes ship via `infra/scripts/deploy.sh frontend` — no Terraform run needed.

### 2026-07-16/17 follow-up — real-device mobile fixes (drawer) + a verification harness

The user deployed the redesigned frontend (`deploy.sh frontend`) and tested on a real Android phone. Screenshots surfaced two mobile bugs, both the same class: **inline `style={{}}` silently overriding responsive CSS** — the exact hazard the design-system rollout is meant to eliminate.

1. **Sidebar stuck open over the content.** The tab-bar breakpoint hid the sidebar with `display:none`, but the component sets `display:flex` inline, which CSS can't override — so mobile showed the sidebar *and* the tab bar at once. Per the user's preference, the sidebar is now a proper **slide-out drawer** on mobile rather than hidden: closed by default (`transform: translateX(-105%)` — transforms aren't set inline so CSS wins), opened by a ☰ button restored to the header (`.g-mobile-menu-btn`), closed by tapping a dimmed backdrop or any link. Desktop unchanged.
2. **Drawer links untappable + Sign out buried (second round, after first deploy of the drawer).** The sidebar's inline `zIndex:40` overrode the drawer's CSS `z-index`, leaving the tap-to-close backdrop (55) *above* the drawer — every tap landed on the backdrop; and the tab bar (45) covered the drawer's sign-out area. z-index now lives only in CSS: **open drawer 61 > backdrop 55 > tab bar 45**. Additionally, the nav's `flex:1` stretch (fine on desktop) pushed the Free Trial panel + account + Sign out off-screen on phones — collapsed on mobile via `.sbd-navwrap { flex: 0 1 auto !important }` (CSS `!important` is the one thing that beats an inline style), so the footer group now sits directly under the nav items.

**Verification harness (new, reusable, in `design/src/`):** because the dashboard is auth-gated, these fixes were verified against the *real* app locally: `_stub_api.py` (stdlib-only stub of `/auth/me`, `/user/stats`, `/projects`, `/topics/history` on :8000) + a temporary `public/_test-auth.html` localStorage injector (deleted after use — recreate from git history/this note if needed) rendered the signed-in dashboard in headless Chrome at phone width; `_drawer-open.html` renders the open-drawer DOM against the actual compiled CSS bundle to prove stacking/layout. Two findings worth keeping: (a) headless Chrome on Windows clamps window width to ~500px — use an iframe wrapper or ≥600px windows when testing sub-500px breakpoints; (b) the stub initially returned `{total, projects}` for `/projects` and the whole dashboard white-screened — live confirmation of audit finding §6.2 #18 (**no error boundary**; any response-shape mismatch blanks the route).

**Lesson recorded for the rest of the rollout:** when a responsive override targets an element with inline styles, either move the property out of inline styles (preferred — done for z-index) or use `!important` deliberately (done for the flex collapse). `display`, `z-index`, and `flex` have each now caused a shipped mobile bug this way.
