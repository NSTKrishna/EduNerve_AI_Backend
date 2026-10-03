# EduNerve AI Backend

Express 5 + Prisma (PostgreSQL) API for AI mock interviews. Interview questions are generated and answers are evaluated with Groq; the live voice call runs in the browser through Vapi.

## Run locally

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET at minimum
npx prisma migrate dev      # creates the schema
npm run prisma:seed         # optional demo data (refuses to run in production)
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` / `npm start` | Start with / without nodemon |
| `npm test` | Vitest + supertest (no database needed, Prisma is mocked) |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm run tokens:grant -- email 50` | Add (or remove, with a negative number) interview tokens |

Without `GROQ_API_KEY` (development only) the server still works: it uses a built-in interview prompt and returns unscored "fallback" feedback.

## Docs

[API_CONTRACT.md](API_CONTRACT.md) describes every endpoint, error code and the frontend flow.

## Layout

```
routes/        URL -> controller wiring, validation and rate limits
controllers/   thin HTTP layer
services/      business logic (auth, interview, tokens, llm, prompt, feedback)
schemas/       zod request schemas
middlewares/   auth, validation, errors, rate limiting
config/        env + interview role/technology options
prisma/        schema, migrations, seed
tests/
```
