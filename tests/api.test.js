import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { prisma } = vi.hoisted(() => {
  const fn = () => vi.fn();
  const prisma = {
    user: { findUnique: fn(), updateMany: fn(), update: fn(), create: fn(), delete: fn() },
    interview: { findFirst: fn(), findUnique: fn(), findMany: fn(), create: fn(), updateMany: fn(), count: fn(), aggregate: fn() },
    tokenTransaction: { create: fn(), findMany: fn() },
    $queryRaw: fn(),
  };
  prisma.$transaction = vi.fn((callback) => callback(prisma));
  return { prisma };
});

vi.mock("../db/prisma.js", () => ({ default: prisma }));

const { default: app } = await import("../app.js");

const auth = (userId = "user-1") => ({
  Authorization: `Bearer ${jwt.sign({ userId, email: `${userId}@x.com` }, "test-secret")}`,
});

const finishedInterview = { id: "i-1", userId: "user-1", status: "completed", tokensCharged: 10 };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.$transaction.mockImplementation((callback) => callback(prisma));
});

describe("authentication", () => {
  it("protects interview routes that used to be public (IDOR regression)", async () => {
    const res = await request(app).get("/api/interview/i-1");
    expect(res.status).toBe(401);
    expect(prisma.interview.findFirst).not.toHaveBeenCalled();
  });

  it("rejects forged tokens", async () => {
    const forged = jwt.sign({ userId: "user-1" }, "some-other-secret");
    const res = await request(app).get("/api/token").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });

  it("login returns the real reason in `error`", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.co", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_CREDENTIALS", error: "Invalid email or password" });
  });

  it("login succeeds and never returns the password hash", async () => {
    const password = await bcrypt.hash("correct-horse", 4);
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1", email: "a@b.co", name: "A", role: null, experience: null, skills: [], tokens: 100, createdAt: new Date(), password,
    });
    const res = await request(app).post("/api/auth/login").send({ email: "A@B.co", password: "correct-horse" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.password).toBeUndefined();
  });

  it("returns field-level validation errors", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "nope", password: "x", name: "" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});

describe("interview ownership", () => {
  it("only looks up interviews owned by the caller", async () => {
    prisma.interview.findFirst.mockResolvedValue(null);
    const res = await request(app).get("/api/interview/i-1").set(auth("user-2"));
    expect(res.status).toBe(404);
    expect(prisma.interview.findFirst).toHaveBeenCalledWith({ where: { id: "i-1", userId: "user-2" } });
  });

  it("serves /options and /user/history before the :id route", async () => {
    const options = await request(app).get("/api/interview/options").set(auth());
    expect(options.status).toBe(200);
    expect(options.body.roles["Frontend Developer"]).toContain("React");

    prisma.interview.findMany.mockResolvedValue([]);
    prisma.interview.count.mockResolvedValue(0);
    const history = await request(app).get("/api/interview/user/history?limit=5").set(auth());
    expect(history.status).toBe(200);
    expect(history.body).toMatchObject({ interviews: [], total: 0, nextCursor: null });
  });

  it("refuses to complete an interview twice", async () => {
    prisma.interview.findFirst.mockResolvedValue(finishedInterview);
    const res = await request(app)
      .post("/api/interview/complete")
      .set(auth())
      .send({ interviewId: "i-1", transcript: [{ speaker: "You", text: "hi" }] });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ALREADY_FINISHED");
  });

  it("refunds the tokens when the candidate never spoke", async () => {
    prisma.interview.findFirst.mockResolvedValue({ ...finishedInterview, status: "in_progress", startedAt: new Date() });
    prisma.interview.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({ tokens: 100 });
    prisma.interview.findUnique.mockResolvedValue({ id: "i-1", status: "abandoned" });

    const res = await request(app)
      .post("/api/interview/complete")
      .set(auth())
      .send({ interviewId: "i-1", transcript: [{ speaker: "Interviewer", text: "Hello?" }] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ feedbackStatus: "none", refunded: 10, tokensRemaining: 100 });
    expect(prisma.tokenTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ delta: 10, reason: "INTERVIEW_REFUND", interviewId: "i-1" }),
    });
  });
});

describe("tokens", () => {
  const body = { role: "Frontend Developer", interviewType: "technical", technologies: ["React"] };

  it("rejects invalid input before touching tokens", async () => {
    const res = await request(app).post("/api/interview/start-interview").set(auth()).send({ ...body, role: "Wizard" });
    expect(res.status).toBe(400);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("returns 402 and creates nothing when the balance is too low", async () => {
    prisma.user.findUnique.mockResolvedValue({ tokens: 5 });
    const res = await request(app).post("/api/interview/start-interview").set(auth()).send(body);
    expect(res.status).toBe(402);
    expect(res.body.code).toBe("INSUFFICIENT_TOKENS");
    expect(prisma.interview.create).not.toHaveBeenCalled();
  });

  it("charges atomically and records the ledger entry on start", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ tokens: 100 }).mockResolvedValueOnce({ tokens: 90 });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview.create.mockResolvedValue({ id: "i-9" });

    const res = await request(app).post("/api/interview/start-interview").set(auth()).send(body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ interviewId: "i-9", tokensRemaining: 90 });
    expect(res.body.assistantConfig.model.messages[0].content).toContain("You are");
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", tokens: { gte: 10 } },
      data: { tokens: { decrement: 10 } },
    });
    expect(prisma.tokenTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ delta: -10, balanceAfter: 90, reason: "INTERVIEW_START", interviewId: "i-9" }),
    });
  });

  it("loses the race gracefully when another request spends the tokens first", async () => {
    prisma.user.findUnique.mockResolvedValue({ tokens: 10 });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    const res = await request(app).post("/api/interview/start-interview").set(auth()).send(body);
    expect(res.status).toBe(402);
    expect(prisma.interview.create).not.toHaveBeenCalled();
  });
});

describe("misc", () => {
  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });

  it("reports DB health", async () => {
    prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    expect((await request(app).get("/api/health")).status).toBe(200);
    prisma.$queryRaw.mockRejectedValue(new Error("down"));
    expect((await request(app).get("/api/health")).status).toBe(503);
  });

  it("answers CORS preflight for allowed origins only", async () => {
    const ok = await request(app).options("/api/auth/login").set("Origin", "http://localhost:5173").set("Access-Control-Request-Method", "POST");
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    const bad = await request(app).options("/api/auth/login").set("Origin", "https://evil.example").set("Access-Control-Request-Method", "POST");
    expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
