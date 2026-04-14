# EduNerve Backend — End-to-End Guide (Frontend Sync)

This document is the **single source of truth** for how your frontend should talk to this backend.

## Base URL

- Local base path: `http://localhost:3000/api`

## Auth header

For protected routes send:

- `Authorization: Bearer <JWT>`
- `Content-Type: application/json`

---

## ✅ What this backend supports

- Email/password auth (JWT)
- Start an interview (returns Vapi `publicKey` + AI system prompt)
- Complete an interview (stores transcript + AI feedback/scores for dashboard)
- Dashboard/profile endpoints to render the UI

Google OAuth is **removed** from the codebase.

---

## Environment variables (.env)

Create a `.env` file in the project root with (minimum):

- `DATABASE_URL` (Postgres connection)
- `JWT_SECRET` (JWT signing secret)

For AI features:

- `GROQ_API_KEY` (used by `services/gemini.service.js` + `services/feedback.service.js`)

For interview voice (Vapi):

- `VAPI_PUBLIC_KEY`
- `VAPI_SECRET_KEY` (not returned to frontend; used server-side if needed later)

---

## End-to-end flows (what frontend should do)

### Flow A: Login → Start Interview (Vapi) → Complete Interview → Show in Dashboard

1. User logs in (`POST /auth/login`) and frontend stores `token`.

2. Frontend calls `POST /interview/start-interview` (protected) to create an Interview session.

- Backend returns `interviewId`, `publicKey` (Vapi), `systemPrompt`, `interviewConfig`.

3. Frontend starts Vapi call using the returned `publicKey` and uses the returned `systemPrompt` as the call/system instructions.

4. When the Vapi session ends, frontend sends transcript + duration to `POST /interview/complete` (protected).

- Backend generates AI feedback (or fallback feedback if AI key missing) and stores it into the `Interview` table.

5. Dashboard screens fetch:

- `GET /auth/dashboard` (protected) for KPI numbers
- `GET /auth/profile` (protected) for the latest `interviews[]` (with feedback/scores) and user profile data

---

## Auth (`/auth`)

### Register

- **POST** `/auth/register`
- Body:
  - `email` (string, required)
  - `password` (string, required, >= 6 chars)
  - `name` (string, required)
  - `role` (string, optional)
  - `experience` (string, optional)
  - `skills` (string[], optional)
- Response: `{ success, message, user, token }`

Frontend notes:

- Save `token` and attach it to all protected requests.

### Login

- **POST** `/auth/login`
- Body: `email`, `password`
- Response: `{ success, message, user, token }`

Frontend notes:

- Save `token`.

### Get Profile (dashboard feed)

- **GET** `/auth/profile` (protected)

Response: `{ success, user }`

This is the best endpoint to build the dashboard “recent activity” sections.

Includes:

- `user.interviews[]` (latest 10)
  - contains: `feedback`, `strengths`, `weakAreas`, `technicalScore`, `communicationScore`, `problemSolvingScore`, `overallScore`, `aiAnalysis`, `transcript`

### Get Dashboard Stats

- **GET** `/auth/dashboard` (protected)
- Response:
  ```json
  {
    "success": true,
    "data": {
      "skillsTracked": 0,
      "interviewSessions": 0
    }
  }
  ```

### Update Profile

- **PUT** `/auth/profile` (protected)
- Body (any subset): `name`, `role`, `experience`, `skills`
- Response: `{ success, message, user }`

---

## Interview (`/interview`)

### Health

- **GET** `/interview/health`

### Start Interview (Vapi initialization)

- **POST** `/interview/start-interview` (protected)
- Body:
  ```json
  {
    "role": "Frontend Developer",
    "interviewType": "technical",
    "technologies": ["React", "JavaScript"]
  }
  ```
- Response:

Response fields:

- `publicKey`: use this in frontend to initialize Vapi.
- `systemPrompt`: pass to Vapi as the system instructions.
- `interviewId`: must be persisted client-side (state/localStorage) and used for completion.
- `interviewConfig`: optional, for UI display (sections + duration).

Frontend contract:

- Start interview UI only after this endpoint succeeds.
- If you lose the `interviewId`, you can’t complete that session.

### Complete Interview (store transcript + AI feedback)

- **POST** `/interview/complete` (protected)
- Body:
  ```json
  {
    "interviewId": "uuid",
    "transcript": [],
    "duration": 420
  }
  ```
- Response:

Response:

- `interview`: updated Interview DB record (what you should show on the report screen)
- `feedback`: structured feedback object (same content stored into the interview)

Important:

- `transcript` can be an array or object; backend stores it as JSON.
- If AI fails or key missing, backend returns fallback feedback so dashboard still works.

### Interview History

- **GET** `/interview/user/history` (protected)

### Interview Report

- **GET** `/interview/:interviewId`

---

## Error handling (frontend expectations)

- On validation errors, backend returns `400` with `{ success: false, error: "..." }`.
- On auth errors, backend returns `401` with `{ success: false, error: "..." }`.
- If a route is wrong, backend returns `404` with `{ success: false, error: "Route ... not found" }`.

---

## Route map (quick reference)

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/profile` (protected)
- `GET /auth/dashboard` (protected)
- `PUT /auth/profile` (protected)

### Interview

- `GET /interview/health`
- `POST /interview/start-interview` (protected)
- `POST /interview/complete` (protected)
- `GET /interview/user/history` (protected)
- `GET /interview/:interviewId`

---

## Frontend flow (recommended)

### Interview

1. Login → save token
2. Start interview → get `interviewId`, `publicKey`, `systemPrompt`
3. Run Vapi session with `publicKey` and `systemPrompt`
4. On call end → send transcript to `/interview/complete`
5. Dashboard loads:
   - `/auth/dashboard` for KPIs
   - `/auth/profile` for recent interviews and feedback

### Notes

- Quiz endpoints are **not supported** in this backend.
