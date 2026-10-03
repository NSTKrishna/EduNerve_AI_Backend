# EduNerve — Improvement, Cleanup & Frontend Sync Plan

Scope: `EduNerve_AI_Backend` (Express 5 + Prisma/Postgres + Groq + Vapi) and `EduNerve_AI_Frontend` (React 19 + Vite + Tailwind 4), reviewed side by side.
Everything below was found by reading the code; file references are exact. Nothing has been changed yet.

**Suggested order:** Phase 0 → 1 → 2 (fix what is broken or unsafe), then 3 (cleanup), then 4–5 (new features), then 6 (quality).

## Implementation status (2026-10-02)

Phases 0–3 and 5 (apart from the items below) are implemented in **both repos**; the backend has 39 tests and the frontend 35, all passing, and the frontend lints clean and builds. The migration was applied to a scratch Postgres with old-style data and `prisma migrate diff` reported no drift. Nothing is committed or deployed.

| Plan item | Status |
|---|---|
| 0.1–0.9 security fixes | Done (ownership checks, no secret fallbacks, per-user tokens, log cleanup, helmet + rate limits, email normalisation) |
| 0.3b `.env` history | Checked: backend history has a 24-char `GOOGLE_API_KEY` and 20-char `VAPI_PUBLIC_KEY` in the first commit's `.env.example` (too short to be real keys, probably placeholders, but rotate if they were real); frontend history has a Google OAuth *client ID* (public by design). `.env.example` is now tracked in both repos. |
| 1.1–1.10 sync bugs | Done (error shape, 0–10 scores, finish-once Vapi hook, server-driven options + assistant config, lean profile, docs) |
| 2.1–2.7 backend refactor | Done, except pagination is cursor-based on history only |
| 3.1–3.2 cleanup | Done (≈1,300 lines of dead frontend code, 5 unused packages, quiz stubs, dead config) |
| 4.1 report page · 4.2 history + trend · 4.3 profile/settings · 4.4 token ledger | Done |
| 4.8 stale sessions | Partial: interviews where the candidate never spoke are auto-refunded; no cron for abandoned tabs |
| 4.10 UI polish | Partial: toasts, live captions, loading/empty/error states, code-splitting. Not done: dark mode, mic test |
| 4.5 richer feedback · 4.6 refresh tokens / email verification / password reset · 4.7 difficulty + JD upload · 4.9 Vapi webhook | **Not started** |
| 5.1 OpenAPI | Replaced by an accurate hand-written `API_CONTRACT.md`; 5.2–5.5 done (envelope, codes, env examples, `/api/v1` alias) |
| 6.1 tests · 6.2 CI · 6.5 deploy hygiene | Done (Vitest, GitHub Actions in both repos, `engines`, graceful shutdown, `/health` with DB ping) |
| 6.3 Prettier/husky · 6.4 Sentry/pino · docker-compose | **Not started** |

**Deploy order:** run `npx prisma migrate deploy` first (the new code needs the new columns), then deploy backend and frontend together — the old frontend sends skills the server now rejects and reads error messages from the wrong field.

---

## Phase 0 — Do first (security / data safety)

| # | Problem | Where | Fix |
|---|---|---|---|
| 0.1 | **Any logged-out visitor can read any interview + transcript + user name/email** by guessing/knowing an ID. Route has no `authenticate`. | [interview.routes.js:36](routes/interview.routes.js#L36), [interview.controller.js:123](controllers/interview.controller.js#L123) | Add `authenticate`; query `where: { id, userId: req.user.userId }`; return 404 otherwise. Drop the `user` include. |
| 0.2 | **`/complete` doesn't check the interview belongs to the caller**, and can be called repeatedly (each call = a paid LLM request and overwrites results). | [interview.controller.js:74](controllers/interview.controller.js#L74) | Filter by `userId`; reject if `status === "completed"` (409). |
| 0.3 | **JWT secret falls back to a hard-coded string** in 4 places. If `JWT_SECRET` is missing in prod, anyone can forge tokens. | [config.js:13](config/config.js#L13), [auth.middleware.js:26](middlewares/auth.middleware.js#L26), [auth.controller.js:68,119](controllers/auth.controller.js) | Remove all fallbacks. In `config.js`, throw at startup if `JWT_SECRET` / `DATABASE_URL` / `GROQ_API_KEY` / `VAPI_PUBLIC_KEY` is missing. Use `config.jwtSecret` only. |
| 0.3b | `.env` currently holds the secrets — confirm it was **never committed** (`git log --all -- .env`) and rotate keys if it ever was. `.gitignore` also ignores `.env.example`, which defeats its purpose. | [.gitignore](.gitignore) | Commit a real `.env.example` (names only) and un-ignore it. |
| 0.4 | **Token balance is one global in-memory variable `T = 300`** shared by *all users*, reset on every restart/deploy, wrong across multiple instances. | [token.controller.js:3](controllers/token.controller.js#L3) | Add `tokens Int @default(100)` to `User` (+ migration). Deduct atomically: `prisma.user.updateMany({ where: { id, tokens: { gte: COST } }, data: { tokens: { decrement: COST } } })` and treat `count === 0` as "insufficient". |
| 0.5 | **Tokens are deducted before validation and never refunded.** Route order is `authenticate → Token → validate → start`, so a 400 or a Groq failure still costs 10 tokens. | [interview.routes.js:19-25](routes/interview.routes.js#L19-L25) | Validate first; charge inside `startInterview` after the interview row is created; refund (or charge on `/complete`) if creation fails. Better: add a `TokenTransaction` table (see 4.4). |
| 0.6 | **Login crashes (500) for any user with `password = null`** (the Google-OAuth rows the schema still allows) — `bcrypt.compare(password, null)` throws. | [auth.controller.js:50](controllers/auth.controller.js#L50) | `if (!user?.password) return 401`. Then drop Google columns (see 3.1). |
| 0.7 | **Logs leak sensitive data**: auth header prefix on every request, full request bodies (incl. passwords) when `NODE_ENV=development`, user emails. | [auth.middleware.js:9](middlewares/auth.middleware.js#L9), [app.js:33-38](app.js#L33-L38), [auth.controller.js:60,114](controllers/auth.controller.js) | Delete these `console.log`s; replace with `pino` / `morgan` (no bodies, redact `authorization`). |
| 0.8 | No rate limiting, no security headers, no body-size cap. Login/register can be brute-forced; `/start-interview` can burn Groq quota. | [app.js](app.js) | Add `helmet`, `express-rate-limit` (strict on `/auth/*` and `/interview/*`), `express.json({ limit: "100kb" })` — except `/complete`, which needs a larger cap for transcripts (~1 MB). |
| 0.9 | Email is not normalised → `A@x.com` and `a@x.com` become different accounts. | [auth.controller.js:24,39](controllers/auth.controller.js#L24) | `email.trim().toLowerCase()` on register + login. |

---

## Phase 1 — Frontend ↔ Backend sync bugs (things that are broken today)

These are the concrete mismatches between the two repos.

1. **Error messages never reach the UI.** Backend returns `{ success:false, error:"…" }`; frontend [api.js:23-27](../EduNerve_AI_Frontend/src/lib/api.js#L23-L27) reads `error.message`, so users see `HTTP 401` instead of "Invalid email or password". (The auth-expiry check in `LearnerContext` only works by accident because the string happens to contain "401".)
   → Pick one shape for the whole API: `{ success, data?, error: { code, message } }`. In the frontend throw an `ApiError` carrying `status` + `code`, and key the "session expired → logout" logic on `status === 401`, not string matching.

2. **Scores display wrong.** Backend scores are **0–10** ([feedback.service.js:151](services/feedback.service.js#L151)); the dashboard's `normalizeScoreToPercent` assumes "0..1 or 0..100", so a 7.5 shows as **8%** and a 1 shows as **100%** ([overview-content.jsx:23-34](../EduNerve_AI_Frontend/src/components/dashboard/overview-content.jsx#L23-L34)).
   → Contract: scores are numbers 0–10; frontend shows `7.5 / 10` (or ×10 for a percent). Delete the guessing logic.

3. **Feedback is silently lost when the call ends from Vapi's side.** The `call-end` handler in [Interview.jsx:310-353](../EduNerve_AI_Frontend/src/components/Interview.jsx#L310-L353) closes over `interviewId` and `transcript` from the render where `startInterview` ran — both are still `null`/`[]`, so it never calls `/complete`. Only the "End Interview" button works.
   → Keep `interviewId`, `transcript`, `startTime` in `useRef`s; one `finishInterview()` function used by both the button and `call-end`, guarded so it runs once. Compute `duration` from `Date.now() - startTime` (the current code also reads stale `callDuration`).

4. **Dashboard "feedback received" counts every interview, including abandoned ones** (`interviews.length`). Backend should return `completedInterviews` and `avgScore` itself (see 2.3) instead of the client recomputing from a capped list of 10.

5. **`/auth/profile` ships full transcripts + `aiAnalysis` for 10 interviews** on every page load / `refreshProfile()`. Heavy and unnecessary.
   → Profile returns user fields only. Dashboard uses `GET /interview/user/history?limit&cursor` returning summary fields; transcript only via `GET /interview/:id`.

6. **Token route is registered twice** (`/api/token` and `/api/interview/token`); frontend uses the first. Remove the duplicate ([interview.routes.js:33](routes/interview.routes.js#L33)). Also `/api/token` is missing from [API_CONTRACT.md](API_CONTRACT.md).

7. **Frontend sends fields the backend ignores / hard-codes things the backend owns:**
   - `Interview.jsx` posts `userId` in the body (made up as `user_${Date.now()}` if no profile) — server uses the JWT; remove it.
   - Hard-coded fallback Vapi public key at [Interview.jsx:287](../EduNerve_AI_Frontend/src/components/Interview.jsx#L287) — remove; if `publicKey` is missing show an error.
   - Vapi call config (model `gpt-3.5-turbo`, voice `paula`) lives in the frontend. Move it to the backend response as `assistantConfig` so models/voices can change without a frontend deploy. (The code already looks for `data.assistantId`, which the backend never sends.)
   - Interview length is described three different ways: `"2-3 minutes"` in [interview.utils.js:20](utils/interview.utils.js#L20), "2-3 minutes total" but 5-7 + 3-5 min sections in the prompt ([gemini.service.js:24-30](services/gemini.service.js#L24-L30)). Pick one (e.g. 10 min) and drive config, prompt, and a Vapi `maxDurationSeconds` from it.
   - Role / technology option lists are hard-coded in the frontend; server only validates "non-empty". Serve them from `GET /interview/options` and validate against them on the server.

8. **Registration collects no profile data** — `SignUpPage` sends `role: ""`, `experience: ""`, `skills: []`, and no screen ever calls `PUT /auth/profile`, even though the API, the sidebar `Settings` icon, and the dashboard text ("Set your experience level") all assume it. → Add a Profile/Settings page (Phase 4).

9. **Docs are out of sync with reality:**
   - Backend `API_CONTRACT.md` says "Google OAuth removed" but the schema has `googleId`/`provider`; omits `/token`; says `AI uses gemini.service.js` for Groq.
   - Frontend `README.md` advertises Quiz Hub, Google OAuth, Framer Motion — none exist any more.
   → Generate an OpenAPI spec (see 6.3) and treat it as the single contract; rewrite both READMEs.

10. **CORS list hard-codes three Vercel URLs** (one per-deployment hash) in [app.js:11-26](app.js#L11-L26), and `methods` omits `PATCH`. → `CORS_ORIGINS` env var (comma-separated) + a regex/callback for `*.vercel.app` previews of this project only.

---

## Phase 2 — Backend refactor (structure + correctness)

2.1 **Centralise errors.** Create `utils/AppError.js` + `asyncHandler`; controllers `throw new AppError(404, "NOT_FOUND", "…")`; one `errorHandler` formats the response. Remove the 15+ copy-pasted `try/catch + console.error + next(error)` blocks. Express 5 already forwards rejected promises, so most `try/catch` can simply go.

2.2 **Real validation.** Replace hand-rolled checks ([validation.middleware.js](middlewares/validation.middleware.js), inline checks in `auth.controller.js`) with `zod` schemas per route (register, login, updateProfile, startInterview, completeInterview). Cap `technologies` length, string lengths, transcript size/shape. Also fixes: `updateProfile` ignores falsy values so users can't clear `skills` ([auth.controller.js:189-192](controllers/auth.controller.js#L189-L192)).

2.3 **Service layer.** Controllers currently talk to Prisma directly. Introduce `services/interview.service.js`, `auth.service.js`, `token.service.js`; controllers only parse input → call service → send response. Add `getDashboardStats(userId)` that returns `{ tokens, totalInterviews, completedInterviews, avgScore, skillsTracked, scoreTrend[] }` in one query (one `groupBy`/aggregate instead of loading rows).

2.4 **Harden the LLM calls** ([feedback.service.js](services/feedback.service.js), [gemini.service.js](services/gemini.service.js)):
   - Rename `gemini.service.js` → `prompt.service.js` (it uses Groq); fix the misleading "Gemini" logs/comments.
   - One shared Groq client + `config.llmModel` (model name is hard-coded in two files; the last two commits were just changing it).
   - Use JSON mode / `response_format: { type: "json_schema" }` and validate with zod instead of stripping ``` fences by hand.
   - Add timeouts + 1 retry; on failure return an explicit `feedbackStatus: "fallback"` flag so the UI can say "AI feedback unavailable" rather than showing fake 6/10 scores as real ones ([feedback.service.js:173-193](services/feedback.service.js#L173-L193)).
   - **Cache the generated system prompt** per `(role, interviewType, sorted technologies)` — currently every interview start pays for an LLM call to build a prompt, and the fallback template is already good. Consider using only the template (deterministic, free, instant) and spending the LLM budget on feedback.
   - Don't interpolate raw user strings (`role`, `technologies`) into prompts unchecked → prompt-injection surface; validate against the allow-list from 1.7.
   - Transcript is truncated with `.slice(0,12000)` on a JSON string, which can cut mid-token; truncate by turns instead.

2.5 **Prisma.**
   - Add indexes: `@@index([userId, startedAt])` on `Interview`.
   - Turn stringly-typed `status`, `interviewType`, `provider` into `enum`s.
   - Replace `Float` scores with a documented 0–10 scale (keep Float, add comment) and store `overallScore` computed server-side only.
   - Add `Interview.tokensCharged Int` for audit/refund.
   - Fix `package.json`: the `"prisma": { "seed": … }` block is **inside `scripts`** ([package.json:11-13](package.json#L11-L13)) so `prisma db seed` doesn't work. Move it to top level.
   - [seed.js](prisma/seed.js) deletes all users/interviews unconditionally — guard with `NODE_ENV !== "production"`.

2.6 **Server lifecycle.** `server.js` calls `process.exit(0)` on SIGTERM without closing the HTTP server or `prisma.$disconnect()`. Close both, with a timeout. Add `/health` that also pings the DB (`SELECT 1`) for the hosting platform.

2.7 **Pagination** on `GET /interview/user/history` (currently returns every row with full transcripts).

---

## Phase 3 — Remove unwanted code

### 3.1 Backend

| Remove | Why |
|---|---|
| [controllers/quiz.controller.js](controllers/quiz.controller.js), [routes/quiz.routes.js](routes/quiz.routes.js) | Empty files; quiz was removed (and API_CONTRACT says unsupported). |
| Deps `@google/generative-ai`, `node-fetch` | Imported nowhere. (Node 18+ has `fetch`.) |
| Move `nodemon`, `tsx`, `typescript`, `@types/node` to **devDependencies** or drop `tsx`/`typescript` | Only `prisma.config.ts` is TS; `nodemon` is a dev tool, not a runtime dep. |
| `config.googleApiKey`, `config.geminiApiKey`, `config.vapiSecretKey` + `GEMINI_API_KEY` mentions | Never read. |
| `optionalAuth` in [auth.middleware.js:51-73](middlewares/auth.middleware.js#L51-L73) | Unused. (Re-add when a public route needs it.) |
| `import { Token }` in [auth.middleware.js:3](middlewares/auth.middleware.js#L3) | Unused import — and creates a circular-import risk. |
| Unused `Token`/`getTokenBalance` imports in `routes/index.js`/`interview.routes.js` once routes are consolidated | |
| `googleId`, `avatar`, `provider` columns (migration to drop) — *or* keep them and actually implement Google sign-in (see 4.6) | The contract says OAuth is removed; the dead columns cause bug 0.6. |
| `buildInterviewSections` export, `dotenv.config()` in `server.js`, `db/config.js`, `gemini.service.js`, `prisma.config.ts` | `config/config.js` already loads dotenv once; the other 4 calls are redundant. Import `config` instead of `process.env` everywhere. |
| `req.tokensRemaining`, `// console.log` leftovers, commented-out code, emoji logs | |
| `.vscode/settings.json` | Editor-specific; add `.vscode/` to `.gitignore`. |
| `/api/interview/token` duplicate route | See 1.6. |
| Dev `console.log(req.body)` middleware | See 0.7. |

### 3.2 Frontend (`EduNerve_AI_Frontend`)

**Dead files — nothing imports them** (verified by grep):

- `src/components/Home.jsx`
- `src/pages/InterviewHubPage.jsx` (279 lines — old quiz/interview hub)
- `src/pages/InterviewPracticePage.jsx` (177 lines) and `src/data/mockData.js` (247 lines, only used by it)
- `src/data/continueContent.js`
- `src/components/dashboard/dashboard-layout.jsx` (duplicate of `layout/DashboardLayout.jsx`)
- `src/components/dashboard/feedback-content.jsx` (211 lines)
- `src/components/dashboard/StatsOverview.jsx`, `InterviewPrepCard.jsx`
- `src/components/common/Badge.jsx` (only used by the dead files above)
- `src/assets/react.svg` (0 bytes), `public/vite.svg`, `public/logo.png` (logo was replaced by the Sparkles icon)
- `src/App.css` — only imported by `Interview.jsx` for Vite template styles; verify nothing relies on it, then drop the import and file.
- `dist/` is on disk — confirm it's git-ignored (it is not tracked, fine).

**Unused dependencies** (no imports found): `@react-oauth/google`, `framer-motion`, `motion`. **Config overlap:** both `tailwind.config.js` and `@tailwindcss/vite` are present — Tailwind 4 doesn't need the JS config unless used; check and remove.

**Code cleanup:**
- Strip debug logging in `LearnerContext.jsx` (token responses, "🔐 Auth check…", logs the JWT at signup: `console.log("Saving token:", response.token)` — remove immediately).
- `Interview.jsx` is 718 lines: move `roles`/`techOptions` to a data file (or server, 1.7), split into `InterviewSetup`, `InterviewSession` components + a `useVapiInterview()` hook; delete the duplicate `/complete` fetch code (it appears twice) and use `interviewAPI` from `lib/api.js` — the file currently re-implements `API_URL`/fetch/auth headers by hand.
- `LearnerContext.jsx`: the same `{ id, name, email, role… }` profile object is built 5 times; the JWT-decode fallback and cached-profile fallback are over-engineered. Extract `toProfile(user)`, drop the manual JWT decode, and keep a single "401 → logout, otherwise keep cached session" branch. Remove `saveInterviewResult` (unused) and the duplicated `authUser` vs `learnerProfile` state (one `user` is enough).
- `ui/button.tsx` + `ui/card.tsx` (shadcn) *and* `common/Button.jsx` both exist → standardise on one Button.
- `<a href="#">` placeholders in `LoginPage.jsx` (forgot password / terms) → real links or remove.
- Mixed `.js/.jsx/.tsx` with no TypeScript setup (`lib/utils.ts`, `ui/*.tsx`) → convert to JS or commit to TS properly.
- Mixed indentation/semicolons (`PrivateRoute.jsx`, `DashboardLayout.jsx` vs rest) → add Prettier; ESLint is already configured.

---

## Phase 4 — New features (ranked by value for effort)

4.1 **Interview report page** (`/interviews/:id`) — the biggest missing piece. Today feedback is a 2-line clamp on the dashboard. Show: scores as radar/bars, strengths, weak areas, `aiAnalysis.notes`, and the full transcript with speaker turns. Backend data already exists; needs 0.1 fixed first.

4.2 **Interview history page** with filters (role, type, date) + pagination, and a **progress-over-time chart** (overall score per session). Backend: `scoreTrend` in dashboard stats (2.3).

4.3 **Profile / Settings page** — edit name, target role, experience, skills (uses existing `PUT /auth/profile`); also change password and delete account (`DELETE /auth/me`, cascades interviews). Pre-fills the interview setup form properly.

4.4 **Real token system** — `TokenTransaction { id, userId, delta, reason, interviewId?, createdAt }`; sign-up grant; show a usage ledger in the UI; admin/seed endpoint to top up. Payment (Razorpay/Stripe) can plug in later — the UI currently says "please purchase a top-up" with nothing to click.

4.5 **Better feedback** — per-question breakdown (question → answer summary → score → suggested better answer), filler-word / words-per-minute stats from transcript timestamps, and "focus areas for next time" that feeds the next interview's prompt (adaptive practice using `weakAreas` from past sessions).

4.6 **Auth upgrades** — refresh tokens or shorter-lived access token (7-day JWT in `localStorage` is long-lived and XSS-exposed; consider an httpOnly cookie), email verification, forgot/reset password, and Google sign-in *if* you want it (frontend dep + schema columns already half-exist; otherwise remove per 3.1).

4.7 **Interview options** — difficulty level (junior/mid/senior), company-style (FAANG, startup), chosen duration, resume/JD upload (paste text first) to tailor questions. Server-driven list from 1.7.

4.8 **Resume the in-progress interview** — if the tab closes mid-call, `Interview.status` stays `in_progress` forever. Add a cron/cleanup that marks stale sessions `abandoned` and refunds tokens; let the dashboard show "Unfinished interview" with a retry.

4.9 **Webhook for Vapi** (`POST /webhooks/vapi`, `end-of-call-report`) — gets the transcript server-side so feedback is generated even if the browser dies, and makes the client `/complete` call a convenience instead of a single point of failure. This is also where `VAPI_SECRET_KEY` (currently unused) belongs.

4.10 **Quality-of-life UI:** toast notifications instead of `alert()` (used in `Interview.jsx`), loading skeletons, empty states, mobile check of the live-interview screen, dark mode, a pre-interview mic test, and live captions from the Vapi transcript events (the transcript state is collected but never displayed).

---

## Phase 5 — Sync workflow (so this doesn't drift again)

1. **Single contract:** add `openapi.yaml` (or generate it from the zod schemas with `zod-to-openapi`) in the backend; delete the hand-written `API_CONTRACT.md` or auto-generate it.
2. **Typed client in the frontend:** generate types/client from the spec (`openapi-typescript`) or at minimum centralise every call in `lib/api.js` (no raw `fetch` in components) and unit-test it against the contract.
3. **Standard response envelope** (1.1) and **error codes** (`INSUFFICIENT_TOKENS`, `INVALID_TOKEN`, `NOT_FOUND`, `VALIDATION_ERROR`) — frontend switches on `code`, never on message text (today's `data?.error?.includes("Token")` check in `Interview.jsx` is brittle).
4. **Env parity:** document `VITE_API_URL` (frontend) and `CORS_ORIGINS` (backend) together in both READMEs; add `.env.example` to both repos.
5. **API versioning:** mount under `/api/v1` now while there's only one client.
6. **Local dev:** root-level `docker-compose.yml` (Postgres) + a README "run both" section; consider a single workspace/monorepo later.

---

## Phase 6 — Quality & ops

6.1 **Tests** — currently none (`"test": "echo \"Error…\""`). Start with `vitest` + `supertest`:
   - auth: register/login/duplicate email/bad password/expired token
   - interview: start (token charge + refund path), complete (ownership, idempotency), get (IDOR regression for 0.1/0.2)
   - tokens: concurrent starts can't overdraw (the atomic-update guarantee)
   - feedback parser: malformed JSON, out-of-range scores, fallback flag
   Frontend: `vitest` + Testing Library for `api.js`, `LearnerContext` (401 vs offline), and the Interview finish-once logic (1.3).

6.2 **CI** (GitHub Actions): install → lint → test → `prisma validate` → build, on both repos.

6.3 **Tooling:** ESLint + Prettier in the backend (frontend already has ESLint), `husky` + `lint-staged`, `.editorconfig`.

6.4 **Observability:** structured logs (`pino`) with a request ID, error tracking (Sentry on both sides), basic metrics on Groq latency/failure rate and Vapi start failures.

6.5 **Deploy hygiene:** backend `engines` field, `npm ci` + `prisma migrate deploy` in the start/release command, production `NODE_ENV` check, DB connection-pool settings for serverless/hosted Postgres.

---

## Suggested milestones

| Milestone | Contents | Result |
|---|---|---|
| **M1 — Safe & correct** (≈ 1–2 days) | 0.1–0.9, 1.1–1.4, 1.6 | No data exposure, per-user tokens, errors and scores display correctly, feedback saves reliably |
| **M2 — Clean** (≈ 1 day) | Phase 3 (both repos), 2.5 `package.json`/seed fixes, README/contract rewrite | ~1,300 lines of dead frontend code and 3 unused deps gone; repos match their docs |
| **M3 — Solid base** (≈ 2–3 days) | Phase 2, 1.5/1.7/1.10, Phase 5.1–5.4, first tests (6.1) | Consistent API envelope, validation, services, contract-driven sync |
| **M4 — Product features** (≈ 1–2 weeks) | 4.1–4.4 first, then 4.5–4.10 | Report page, history/trends, profile, real token ledger, webhook-backed completion |
| **M5 — Production-ready** | 4.6, 6.2–6.5 | CI, observability, hardened auth |

## Notes / assumptions

- Estimates are rough and assume one developer.
- Items marked "verify" (App.css reliance, Tailwind config, `.env` history) need a quick check before deleting.
- Phase 3 deletions are low-risk because each file was confirmed unimported with `grep`, but run `npm run build && npm run lint` in the frontend after removing them.
- I haven't modified any code. Say the word and I'll start with M1 (backend and frontend changes together so they stay in sync).
