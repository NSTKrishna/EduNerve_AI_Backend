# EduNerve Backend — API Contract

Single source of truth for how the frontend talks to this backend. Keep it in sync with
`schemas/index.js` (request validation) and the services in `services/`.

## Conventions

- **Base URL:** `http://localhost:3000/api` (also served at `/api/v1`). The frontend reads it from `VITE_API_URL`.
- **Auth:** protected routes need `Authorization: Bearer <JWT>`. JWTs last 7 days (`JWT_EXPIRES_IN`).
- **Bodies:** JSON, max 100 KB (`POST /interview/complete`: 1 MB).
- **Success:** `{ "success": true, ...fields }`
- **Error:** always the same shape, so clients only need one handler:

  ```json
  { "success": false, "code": "INSUFFICIENT_TOKENS", "error": "Human readable message", "details": [{ "field": "role", "message": "Unknown role" }] }
  ```

  `details` appears only for validation errors. **Switch on `code`, never on the message text.**

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `INVALID_JSON` | Bad input (`details` lists the fields) |
| 401 | `UNAUTHORIZED` / `INVALID_TOKEN` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS` | Missing, bad or expired JWT; wrong login |
| 402 | `INSUFFICIENT_TOKENS` | Not enough tokens to start an interview |
| 403 | `INVALID_PASSWORD` | Wrong current password (change password / delete account) |
| 404 | `NOT_FOUND` | Unknown route, or not found **for this user** (other users' interviews look like 404) |
| 409 | `EMAIL_TAKEN` / `ALREADY_FINISHED` / `CONFLICT` | Duplicate email; interview already submitted |
| 413 | `PAYLOAD_TOO_LARGE` | Body over the limit |
| 429 | `RATE_LIMITED` | Too many requests |
| 5xx | `INTERNAL_ERROR` / `DB_UNAVAILABLE` | Server problem |

- **Scores** are numbers from **0 to 10** (one decimal), or `null` when there was no AI evaluation. Show `7.5 / 10`, or multiply by 10 for a percent.
- **Timestamps** are ISO 8601 strings. **Durations** are seconds.

## Environment variables

See `.env.example`. Required to boot: `DATABASE_URL`, `JWT_SECRET`. In production also `GROQ_API_KEY`, `VAPI_PUBLIC_KEY`.
Optional: `CORS_ORIGINS` (comma separated), `LLM_MODEL`, `VAPI_MODEL`, `VAPI_VOICE_ID`, `TRUST_PROXY`.

---

## Health

- `GET /health` → `{ success, status: "ok", timestamp }` (503 `DB_UNAVAILABLE` if the database can't be reached)

## Auth (`/auth`)

User object returned everywhere:
`{ id, email, name, role, experience, skills: string[], tokens: number, createdAt }`

| Route | Body | Response |
|---|---|---|
| `POST /auth/register` | `email`, `password` (8–72 chars), `name`; optional `role`, `experience`, `skills[]` | `201 { user, token }` — new users get 100 tokens |
| `POST /auth/login` | `email`, `password` | `{ user, token }` |
| `GET /auth/profile` 🔒 | — | `{ user }` (no interviews — use the history endpoint) |
| `PUT /auth/profile` 🔒 | any of `name`, `role`, `experience`, `skills[]` (`""` / `[]` clears) | `{ user }` |
| `PUT /auth/password` 🔒 | `currentPassword`, `newPassword` | `{ message }` |
| `DELETE /auth/me` 🔒 | `password` | `{ message }` — deletes the account, interviews and token history |
| `GET /auth/dashboard` 🔒 | — | see below |

Emails are trimmed and lower-cased. Login/register/password routes are rate limited (30 per 15 min per IP).

### `GET /auth/dashboard`

```json
{
  "success": true,
  "data": {
    "tokens": 80,
    "skillsTracked": 4,
    "interviewSessions": 7,
    "completedInterviews": 5,
    "avgScore": 7.2,
    "avgScores": { "technical": 7.5, "communication": 7, "problemSolving": 7.1 },
    "scoreTrend": [
      { "id": "…", "date": "2026-10-01T…", "overall": 6.5, "technical": 7, "communication": 6, "problemSolving": 6.5 }
    ]
  }
}
```

`scoreTrend` holds the last 10 scored interviews, oldest first. Averages ignore interviews without scores.

## Tokens (`/token`) 🔒

- `GET /token` → `{ tokensRemaining }`
- `GET /token/transactions?limit=30` → `{ transactions: [{ id, delta, balanceAfter, reason, interviewId, createdAt }] }`
  `reason` is `SIGNUP_GRANT`, `INTERVIEW_START`, `INTERVIEW_REFUND` or `ADMIN_ADJUSTMENT`.

An interview costs **10 tokens**, charged when it starts and refunded automatically if the candidate never spoke.
Top up manually with `npm run tokens:grant -- user@example.com 50`.

## Interview (`/interview`) 🔒 — every route requires auth

### `GET /interview/options`

```json
{ "roles": { "Frontend Developer": ["React", "Vue.js", "…"], "…": [] },
  "interviewTypes": ["technical", "behavioral", "mixed"], "maxTechnologies": 8, "tokenCost": 10, "durationMinutes": 10 }
```

Render the setup form from this; the server validates against the same lists.

### `POST /interview/start-interview`

Body: `{ role, interviewType, technologies[] }` — `role` must be a key of `roles`, every technology must belong to that role.

Response:

```json
{
  "success": true,
  "interviewId": "uuid",
  "publicKey": "<vapi public key>",
  "role": "…", "interviewType": "…", "technologies": ["…"],
  "systemPrompt": "You are …",
  "interviewConfig": { "type": "mock_interview", "durationMinutes": 10, "durationSeconds": 600, "sections": ["Introduction", "…"] },
  "assistantConfig": { "name": "…", "model": {}, "voice": {}, "firstMessage": "…", "maxDurationSeconds": 660 },
  "tokensRemaining": 90
}
```

Start the Vapi call with `new Vapi(publicKey)` and `vapi.start(assistantConfig)`. Keep `interviewId`; you need it to finish.
Errors: `402 INSUFFICIENT_TOKENS` (nothing is charged), `400 VALIDATION_ERROR`.

### `POST /interview/complete`

Body: `{ interviewId, transcript: [{ speaker: "Interviewer" | "You", text, timestamp? }], duration? }` (max 500 turns).
Submit exactly once per interview.

Response: `{ success, message, interview, feedback, feedbackStatus, refunded, tokensRemaining }`

`feedbackStatus`:
- `"ai"` — scored; `interview` has scores, `feedback`, `strengths`, `weakAreas`, `aiAnalysis`.
- `"fallback"` — saved, but the AI evaluation failed. All scores are `null`; tell the user.
- `"none"` — the candidate never spoke. Interview is marked `abandoned`, `refunded` tokens are returned.

Errors: `404 NOT_FOUND` (not yours), `409 ALREADY_FINISHED`.

### `GET /interview/user/history`

Query: `limit` (1–50, default 20), `cursor` (the previous `nextCursor`), `status`, `interviewType`, `role`.
Response: `{ interviews: [summary], count, total, nextCursor }` — `nextCursor` is `null` on the last page.

A summary has everything except `transcript` and `aiAnalysis`:
`id, role, interviewType, technologies, status, duration, startedAt, completedAt, feedback, strengths, weakAreas, technicalScore, communicationScore, problemSolvingScore, overallScore`.
`status` is `in_progress`, `completed` or `abandoned`.

### `GET /interview/:interviewId`

`{ interview }` — the full record including `transcript` and `aiAnalysis`. Only the owner can read it (404 otherwise).

---

## Frontend flow

1. Login/register → store `token`.
2. `GET /interview/options` → render the form.
3. `POST /interview/start-interview` → start Vapi with `assistantConfig`, show `tokensRemaining`.
4. Collect final transcript turns while the call runs.
5. When the call ends (user clicks End **or** Vapi ends it) → `POST /interview/complete` once → navigate to the report for `interview.id`.
6. Dashboard: `GET /auth/dashboard` + `GET /interview/user/history?limit=5`.
