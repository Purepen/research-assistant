# Research Assistant → Enterprise AWS Serverless Product

## Context

The research-assistant (FastAPI + Next.js research-proposal generator with a 7-phase OpenAI-Agents pipeline, built solo over 7 months) currently runs as a single local process on SQLite. Goal: relaunch it as a subscription SaaS on AWS — pipeline phases as separate Lambda functions orchestrated by Step Functions, provisioned via Terraform, monetized with Stripe subscriptions + BYOK (users bring their own API keys). The 2026-07-10 audit (`context.md` at repo root) is the ground truth for architecture and the 11 verified bugs; this plan builds on it and on direct code verification done today.

**User-approved decisions:** Aurora Serverless v2 PostgreSQL · stabilize-first sequencing · Stripe subscriptions + BYOK · Terraform · **lean cost posture (~$45–70/mo: prod-only env, no RDS Proxy, single NAT, Aurora 0-ACU auto-pause)** · Lambda granularity delegated to me → **per-phase Lambdas + one section-writer Lambda invoked 7× by the state machine** (per-agent retry/observability without 25 functions).

**Verified-in-code findings that shape the design** (each confirmed by direct read, not assumed):
1. `phase4_workflow.py:271-276` — reviewer feedback is appended as `[REVISION NOTE:…]` to *already-generated* sections; the 7 writers regenerate blind each iteration. The new loop passes `previous_feedback` into writer contexts — deliberate behavior improvement, must be tested explicitly.
2. S3 storage is broken end-to-end today: `storage_adapter.py:105` `_save_s3` returns `key`/`url` but `storage_service.py:69/90/121` and `routes/research.py:148/160` read `result["path"]` → KeyError; pipeline consumers (`Document(path)`, `_read_file_text`, `profile_dataset`) expect local paths.
3. `pyproject.toml` declares only pandas+openpyxl; `requirements.txt` misses `openai-agents`/`pandas`/`openpyxl`. Neither manifest alone installs a working app (audit Bug #4).
4. Topic Lab routes run LLM+web-search calls synchronously in the request path — exceeds API Gateway's ~30s cap; needs an async-job pattern in the cloud.
5. `api/dependencies.py:35` runs `create_all()` at import time — must go when Alembic lands.
6. `dashboard/projects/[id]` dynamic route + `next.config.js` `headers()` (COOP for Google OAuth popup) rule out static export → Amplify Hosting, not CloudFront+S3.
7. `max_iterations` is per-request user config (1–5) → Choice-state loop bound comes from run config.

---

## Workstream 0 — Stabilize (pre-cloud, ~1 week)

Ordered per audit priority; one commit per fix, with tests.

| # | Fix | Where |
|---|-----|-------|
| 0.1 | Export `User` from types (frontend build breaks today, Bug #3); delete dead `components/results/*` together with this to get `tsc`/`next build` green | `frontend/src/types/index.ts` |
| 0.2 | Phase display always "Unknown" (Bug #1): key `ProjectLifecycle` lookups by `status.value` string. Unit test: every DB `ProjectStatus` maps to a real phase | `backend/app/api/routes/projects.py:117`, `core/domain/project.py` |
| 0.3 | BYOK silently no-ops for Phases 1/3 (Bug #2): implement `build_phase1_agents`/`build_phase3_agents` mirroring the working Phase 2/4/5 factories; remove the `try/except` swallows | `core/agents/definitions/phase1_agents.py`, `phase3_agents.py`; `phase1_workflow.py:60`, `phase3_workflow.py:639-653` |
| 0.4 | Consolidate deps into `pyproject.toml` (single source, uv-managed): add `openai-agents` (pin exact), pandas, openpyxl, mangum, everything from requirements.txt; regenerate requirements.txt via `uv export`. Acceptance: fresh venv → `uv sync` → imports + pytest pass | `backend/pyproject.toml` |
| 0.5 | Encrypt BYOK keys (Bug #6): new `core/crypto.py` with `SecretCipher` protocol + `FernetCipher` (env `FERNET_KEY`, fail-fast); KMS implementation drops in later. Migrate existing rows via script; stop printing key suffixes (`research_service.py:130`) | `routes/user.py`, `research_service.py:126-136`, `backend/scripts/encrypt_existing_keys.py` |
| 0.6 | JWT fail-fast (Bug #7): remove `"your-secret-key"` fallback; startup check ≥32 chars | `services/auth_service.py:27` |
| 0.7 | Phase-6 naming collision (Bug #8): rename `phase6_workflow.py` → `email_delivery.py` (it's Resend delivery, not pipeline Phase 6) | `core/pipelines/`, import in `research_service.py` |
| 0.8 | Delete dead-code inventory exactly per `context.md` §7 (keep `core/domain/project.py` — live). Re-grep before each delete | backend + frontend lists in §7 |
| 0.9 | Minimal pytest suite: `test_track_paradigm` (incl. B5 regression case), `test_spec_validator`, `test_locked_requirements`, `test_auth`, `test_crypto`, `test_byok_factories`, and **`test_pipeline_wiring`** — monkeypatch `Runner.run` with canned outputs, run full pipeline `max_iterations=1`, assert phase sequencing + result shape. This is the golden harness protecting the WS1 refactor | `backend/tests/` |
| 0.10 | GitHub Actions CI: backend (uv sync, ruff, pytest) + frontend (`tsc --noEmit`, `next build`), required on PRs | `.github/workflows/ci.yml` |

**Verify:** fresh clone → both builds green → one full local generation (testing tier, max_iterations=1) completes; project page shows a real phase name; save its `complete_results` JSON as the golden fixture.

---

## Workstream 1 — Cloud-ready refactor (~2 weeks, still runs locally)

### 1.1 Pipeline-state S3 contract
Step Functions payloads carry **only references** (256KB limit): `{project_id, user_id, state_bucket, run_prefix, config_key, uploads{...s3 keys}, model{tier, byok}, iteration, max_iterations, review{decision,marks}, best{iteration,marks}}` — never content, never API keys (fetched from DB per invocation).

Artifacts under `runs/{project_id}/{execution}/` (Pydantic `model_dump_json`, track-discriminated envelopes for A/B unions): `config.json`, `phase0/context.json`, `phase1/{web,user_projects,auto_projects}.json`, `phase2/{synthesis,locked}.json`, `iter{N}/{sections,specification,review,validation}.json` + `feedback.txt`, `final/{specification.json,critic.txt}`. Deterministic keys → retries safely overwrite. New module: `core/pipelines/state_io.py` (`load_artifact`/`save_artifact` + `load_locked`/`load_synthesis` envelope helpers).

### 1.2 Lambda entrypoints — new package `backend/app/lambdas/`
Thin handlers around existing functions: `api.py` (Mangum), `phase0_prepare.py`, `phase1_web.py`, `phase1_user_dumps.py`, `phase1_auto_projects.py`, `phase2_synthesis.py`, `phase3_section_writer.py` (`event.section` discriminator), `phase4_format.py`, `phase5_review.py`, `phase6_post.py`, `finalize.py`, `on_failure.py`, `topic_lab.py`.

Shared `_runtime.py`: settings, DB session factory, **unconditional per-invocation BYOK key set** (warm containers serve different users — fixes the leakage risk in `research_service.py:121-168`), `report_progress()` preserving the exact percentages the frontend polls today.

Required refactors of existing code:
- `phase3_workflow.py`: extract `write_single_section(section_key, locked, guidelines, sections_so_far, config, previous_feedback)` from the 7 inline blocks (per-section context builders already exist). Feedback now enters writer context (finding #1).
- `phase4_workflow.py`: expose `format_sections(...)` standalone; drop the `[REVISION NOTE]` post-hoc append.
- `phase5_workflow.py`: extract single-iteration `review_once(...)`; the loop moves to the state machine.
- `research_service.py`: split into `ProjectService` (API-side) + generation logic (handlers). `/generate` calls `sfn.start_execution` behind a `PIPELINE_MODE=stepfunctions|local` switch; stores `execution_arn`. `/cancel` calls `StopExecution` — **architectural fix for Bug #5**.
- New `Project` columns: `sfn_execution_arn`, `state_prefix` (Alembic).
- **Local orchestrator** `backend/scripts/run_pipeline_local.py`: drives the same handlers in a Python loop (mimics the ASL incl. review loop) against MinIO/dev-S3 — permanent local-dev path and WS1 verification tool.

### 1.3 SQLite → Postgres
`backend/alembic/` baseline from `Base.metadata`; remove `create_all` from `dependencies.py:35`; `NullPool` in Lambda; `scripts/migrate_sqlite_to_postgres.py` (enum-as-string values port cleanly; encrypt keys first).

### 1.4 Storage → S3 (fix finding #2)
`_save_s3` returns `"path": key` (canonical id in both modes); add `StorageAdapter.download_to_tmp(key)`; route pipeline consumers through it. Buckets: `{app}-{env}-uploads`, `{app}-{env}-pipeline-state` (90-day lifecycle on `runs/`).

### 1.5 Config + logging
`core/settings.py` (pydantic-settings) replaces scattered `os.getenv` across `dependencies.py`, `auth_service.py`, `storage_adapter.py`, `email_adapter.py`, `main.py`; Secrets Manager fetch at cold start. Adopt `aws-lambda-powertools` (Logger/Metrics/Tracer) in `app/lambdas/*`; convert pipeline `print()`s opportunistically.

### 1.6 Topic Lab async (finding #4)
`POST /topics/{discover,scout,vet,find-projects}` → return `job_id`, invoke `topic_lab` Lambda async (`InvocationType=Event`); results in new `topic_jobs` table; frontend polls `GET /topics/jobs/{id}` (React Query polling already the norm). Ship `/discover` first, timebox the rest.

**Verify:** golden-fixture wiring test green; `run_pipeline_local.py` on the WS0 golden project → same result shape; `alembic upgrade head` + `alembic check` clean; migration script round-trips row counts.

---

## Workstream 2 — Terraform + Step Functions (~2 weeks)

### 2.1 State machine (`infra/modules/pipeline/statemachine.asl.json`)
```
Phase0Prepare → Phase1Discovery (Parallel: Web | UserDumps | AutoProjects)
→ Phase2Synthesis → InitIteration (Pass: iteration=1, best={marks:-1})
→ WriteJustification → WriteObjectives → WriteLiterature → WriteMethodology
→ WriteWorkPlan → WriteReferences → WriteAbstract        (7 states, same Lambda)
→ Phase4Format → Phase5Review (returns {decision, marks}; maintains best pointer)
→ ReviewChoice: APPROVED → Phase6Post
              | iteration ≥ max_iterations → Phase6Post   (best iteration wins)
              | else NextIteration (iteration+1) → WriteJustification
→ Phase6Post → Finalize (DB rows, COMPLETE, email; email failure non-fatal)
All tasks: Retry {TaskFailed, ×2, backoff 2} · Catch → OnFailure → Fail
Execution timeout 7200s; per-state 900s.
```

### 2.2 Packaging
**One shared container image** for all Lambdas (pandas 3 + lxml + python-docx + openai-agents put the 250MB zip limit at risk), `image_config.command` per function, `public.ecr.aws/lambda/python:3.12`, lazy pandas import. One ECR repo, image tag = git SHA.

### 2.3 Terraform layout — lean posture
Directory-per-env structure, but **only `envs/prod/` initially** (dev spun up on demand from the same modules):
```
infra/modules/{network, aurora, storage, security, api, pipeline, frontend, observability, ci}
infra/envs/prod/{main.tf, backend.tf, terraform.tfvars}
```
- `network`: VPC, 2 private + 2 public subnets, **single NAT gateway** (OpenAI egress), VPC endpoints (S3 gateway, Secrets Manager, States, ECR, CloudWatch).
- `aurora`: Aurora Sv2 PostgreSQL, **min 0 ACU auto-pause, no RDS Proxy** (direct + NullPool); proxy is a later drop-in module flag.
- `security`: KMS CMK; secrets: JWT, system OpenAI key, Resend, Fernet, Stripe.
- `api`: API Lambda + **HTTP API** Gateway (not REST; app-level quotas make usage plans moot), custom domain, route throttling (burst 20 / 10 rps).
- `pipeline`: 12 Lambdas (shared image), state machine, IAM, DLQ.
- `frontend`: **Amplify Hosting** (`aws_amplify_app` + branch + domain) — required by finding #6.
- `observability`: log retention, dashboard (executions, per-phase duration, Lambda errors, Aurora ACU, API 5xx), alarms (ExecutionsFailed ≥1, API 5xx >2%, OnFailure invocations, DLQ >0).
- `ci`: GitHub OIDC deploy role. `deploy.yml`: build/push image → `terraform apply` → e2e smoke → (manual gate when dev env exists later).
- Email: **keep Resend** (works today, zero infra, no SES sandbox exit); SES module stub deferred.

**Verify:** apply converges twice (idempotent); `scripts/e2e_dev_run.py` — register user via API, upload fixture .docx, POST `/generate` (testing tier, max_iterations=1), poll to COMPLETE, assert result shape, download .docx (~$0.50–2 OpenAI spend); failure drill (forced raise → Retry×2 → OnFailure → FAILED status); **cancellation drill (StopExecution mid-Phase-3 → no further states — Bug #5 fix proven)**; Amplify serves app, Google OAuth popup works (COOP header), polling works.

---

## Workstream 3 — Product / enterprise layer (~2–3 weeks, behind flags)

- **3.1 Stripe:** tables `subscriptions`, `usage_records` (Alembic); `routes/billing.py` (checkout-session, portal-session, signature-verified webhook for `checkout.session.completed`, `customer.subscription.updated|deleted`); `entitlement_service.py` + `require_entitlement("generate")` dependency on `/research/generate`, `/topics/*`. Tiers: Free = 1 run/mo BYOK-only testing tier · Pro = N runs/mo, all tiers · Enterprise = org seats, pooled quota, Anthropic BYOK.
- **3.2 Metering/quotas:** insert `usage_records` before `StartExecution` (refund on throw); period count vs tier limit → 402 with upgrade CTA; optionally record per-phase token usage into `ProjectAnalytics`.
- **3.3 Multi-provider BYOK:** `user_api_keys` table (provider `openai|anthropic`, encrypted); extend `AgentModelConfig` resolution so `anthropic/claude-…` ids build `LitellmModel(model, api_key)` (openai-agents LiteLLM extension). **Constraint: agents using `WebSearchTool` (web_search, project_finder, topic scouts) stay pinned to OpenAI** — encode in config builder + UI copy.
- **3.4 Teams/orgs:** `organizations`, `organization_members` (roles), `projects.organization_id`; invites reuse the email-verification-token pattern; org switcher in `Header.tsx`. SSO/SAML out of scope this pass.
- **3.5 Rate limiting:** simple per-user window counter in Postgres on auth + LLM routes; API GW throttling as outer layer.

**Verify:** Stripe test mode + `stripe listen`: subscribe → tier live → quota enforced (N+1th run → 402) → cancel → downgrade. LiteLLM run with test Anthropic key completes Phases 2–5 on Claude while web-search agents stay OpenAI. Org member draws from pooled quota. 429 integration test.

---

## Cost, risks, sequencing

**AWS baseline (lean):** ~$45–70/mo — NAT $33 + Aurora 0-ACU (pauses idle) + Amplify ~$5–15 + CloudWatch/Secrets/ECR ~$10; Lambda/SFN/API GW near-zero at low volume (~$0.05/run). Marginal cost per generation is OpenAI spend, offloaded via BYOK.

**Top risks:** (1) review-loop semantics change — mitigated by golden fixture + side-by-side runs; (2) Pydantic A/B-union serialization across phase boundaries — envelope + round-trip tests; (3) Phase-1 web branch nearing the 15-min cap — Parallel split + `max_papers` knob + duration alarm; (4) BYOK key handling in warm containers — unconditional per-invocation set + test; (5) SQLite→PG cutover — rehearse on a copy; (6) Topic Lab conversion touches the largest route file + a 1,160-line page — timebox, `/discover` first.

**Timeline:** WS0 wk 1 → WS1 wks 2–3 → WS2 wks 4–5 → WS3 wks 6–8. Terraform skeleton can start during late WS1.

**Critical existing files:** `core/pipelines/main_pipeline.py` (orchestration being decomposed; progress %s; result shape) · `phase5_workflow.py:201-340` (loop → Choice states) · `services/research_service.py` (BYOK, progress, save/analytics → split) · `phase3_workflow.py` (7 blocks → section-writer Lambda) · `api/dependencies.py` (engine/session/create_all).
