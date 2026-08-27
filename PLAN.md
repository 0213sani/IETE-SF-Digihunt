# DigiHunt — Build Plan

Empty repo, from scratch. No existing docs to discover (Phase 0 skipped — stack is stable/standard: Next.js App Router, FastAPI, SQLAlchemy 2.0, Alembic, PyJWT+argon2-cffi, FastAPI WebSockets. APIs below are current stable APIs, not invented.)

## Allowed APIs (Phase 0 result)
- **Next.js**: App Router (`app/`), Server Components default, `"use client"` for interactive, Route Handlers not needed (backend is FastAPI, not Next API routes).
- **FastAPI**: `APIRouter`, `Depends`, `HTTPException`, `WebSocket`/`WebSocketDisconnect`, Pydantic v2 models (`BaseModel`, `model_config`).
- **SQLAlchemy 2.0**: `DeclarativeBase`, `Mapped`/`mapped_column`, `sessionmaker`, async optional — use sync `Session` + `psycopg` driver for simplicity (no async win here, avoid complexity).
- **Alembic**: standard `alembic init`, autogenerate migrations.
- **Auth**: `python-jose` or `PyJWT` for JWT, `argon2-cffi` via `passlib.hash.argon2` or direct `argon2` lib for hashing.
- **Atomic claim**: Postgres `SELECT ... FOR UPDATE SKIP LOCKED` or a unique constraint + `UPDATE ... WHERE status='available' RETURNING`, inside one transaction. No app-level locks (would break multi-worker).
- **Anti-patterns**: no answers/master code ever serialized into any Pydantic response model sent to participant role; no frontend Postgres client; no localStorage for competition state.

## Groups (each = one claude-mem:do checkpoint; run /graphify --update after each)

**G1 — Scaffold + landing** (spec phases 1-2)
Files: `frontend/` (Next.js+TS+Tailwind+shadcn init), `app/page.tsx` (hero/story/how-it-works/rounds/cases/tech/rules/faq/cta), `app/globals.css` (dark navy/cyan design tokens), `README.md`, root `.gitignore`.
Check: `npm run dev` renders landing, responsive at 375/1024/1440.

**G2 — Backend skeleton + DB schema** (spec phases 3-4)
Files: `backend/app/main.py`, `backend/app/core/{config.py,db.py}`, `backend/app/models/*.py` (all 13 tables from spec §38), `backend/alembic/`, `backend/.env.example`.
Check: `alembic upgrade head` runs clean against local Postgres; `\dt` shows all tables.

**G3 — Auth** (spec phase 5)
Files: `backend/app/core/security.py` (argon2 hash/verify, JWT encode/decode), `backend/app/routers/auth.py` (`/auth/register-team`, `/auth/login`, `/auth/me`), `backend/app/core/deps.py` (`get_current_user`, `require_role`).
Check: register 3-member team → 3 rows in users, 1 in teams; login each → JWT; wrong password → 401.

**G4 — Team system + dashboard** (spec phases 6-7, 9, 10 — register/login UI was missing from this plan, folded in here since nothing reaches the dashboard without it)
Files: `backend/app/routers/teams.py`, `frontend/app/register/page.tsx`, `frontend/app/login/page.tsx`, `frontend/lib/api.ts` (fetch wrapper + JWT storage), `frontend/app/dashboard/page.tsx` (mission control: members list, current-user highlight, round progress bars stubbed at 0/locked until G5-G7 wire real data).
Check: all 3 members' `/teams/me` return same team_id; register → login → dashboard works in a real browser for a fresh team.

**G5 — Round 1 engine** (spec phases 8-10)
Files: `backend/app/models/question_template.py` usage, `backend/app/services/question_gen.py` (deterministic seed = hash(team_code), blueprint-based category mix), `backend/app/routers/questions.py` (`claim`/`release`/`answer` — atomic via `UPDATE...WHERE status='available' RETURNING`), `frontend/app/round1/page.tsx` (shared board).
Check: two simultaneous claims on same question → exactly one succeeds (test with concurrent requests); correct answer → code fragment awarded, no answer ever in response body.

**G6 — Round 2** (spec phases 11-13; corrected scope — `case_files`/`team_cases` are actually Round 3's, see G7)
Round 2's "case file" (spec §22) is ONE shared incident narrative (server log, suspicious email, timeline) for every team — not a per-team assignment, no dedicated table needed. Serve it as a static structured payload.
Files: `backend/app/core/deps.py` add `require_round_unlocked(round_number)` dependency factory + `backend/app/services/round_gate.py` (`is_round_unlocked(db, team, round_number)` — round 1 always true; round N unlocked iff team has ≥1 round-(N-1) question AND all are solved, avoiding the vacuous-truth bug of total==0), generalize `question_gen.assign_round1` into `assign_round(db, team, round_number, blueprint)` and reuse G5's existing `/questions/{id}/claim|release|answer` (already round-agnostic) plus a new `GET /questions/round/2` using blueprint `[("who",1),("what",1),("when",1),("how",1),("why",1)]`, `backend/app/routers/incident.py` (`GET /incident` — static evidence payload), wire `require_round_unlocked(2)` onto both. Also replace G4's hardcoded `round2.locked: true` in `teams.py` with `is_round_unlocked(db, team, 2)`.
Check: hitting `/questions/round/2` before Round 1 complete → 403; after complete → 200; dashboard's round2 card reflects real state.

**G7 — Round 3 + submissions** (spec phases 14-15, 26-27 — case_files/team_cases belong here)
Files: `backend/app/services/case_gen.py` (deterministic pick of 1-of-4 `CaseFile` rows via `seeded_rng(team.team_code)`, idempotent `TeamCase` row), `backend/app/routers/cases.py` (`GET /cases/me` — assigns+returns the team's case), `backend/app/routers/submissions.py` (upload/list/download, path = `uploads/{team_code}/submission_v{n}.pptx`, MIME+ext+size check, ownership check on download, gated by `require_round_unlocked(3)`), `frontend/app/round3/page.tsx`. Also replace `teams.py`'s `round3.locked` with `is_round_unlocked(db, team, 3)` (round 3 unlocked when round 2's 5 questions are all solved).
Check: team A cannot fetch team B's submission path (403); re-upload creates v2, marks v1 not-current; upload after deadline → 423; case_files table needs ≥4 active rows to test against (seed 4 minimal rows in this group's own verification — full content is G8's seed script).

**G8 — Admin** (spec phases 16, plus §46-48)
Files: `backend/app/routers/admin.py` (teams/questions/templates/cases/submissions/settings/reset controls), `backend/app/seed.py` (3 demo teams, 20+ Q/round, 4 cases, judges), `frontend/app/admin/*`.
Check: seed script runs idempotently; admin-only routes 403 for participant/judge JWT.

**G9 — Judge** (spec phase 17/34)
Files: `backend/app/routers/judging.py` (assigned teams, score draft/finalize, total capped /60), `frontend/app/judge/*`.
Check: finalized score rejects further edit; participant JWT gets 403 on judging routes.

**G10 — Master Terminal + WebSockets** (spec phases 18-19)
Files: `backend/app/websocket/manager.py` (team-room connection registry), `backend/app/routers/master.py` (server-only code, hashed, `/master/verify`), events list from spec §37 broadcast on claim/solve/unlock/submission actions, `frontend/app/master/page.tsx`, `frontend/hooks/useTeamSocket.ts`.
Check: member 1 solves Q → member 2's open tab updates without refresh; wrong master code → attempt logged, no lockout bypass.

**G11 — Hardening + polish** (spec phases 20-22)
Files: rate-limit middleware (slowapi or simple in-memory token bucket per IP+route), CORS from env, uniform error envelope, accessibility pass (labels/contrast/focus), final `/graphify` run + `GRAPH_REPORT.md` reviewed for orphan/dead code.
Check: run spec §60 checklist manually once end-to-end with 3 real browser sessions.

## Verification checklist (final phase)
- Every participant-role response model audited: no `correct_answer`, `code_hash`, `password_hash`, other-team data.
- grep for `team_id` accepted from request body/query on any mutating route — must not exist; team always derived from JWT.
- grep for hardcoded DB URL/secret — must not exist outside `.env.example`.
