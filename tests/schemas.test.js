import { describe, expect, it } from "vitest";
import {
  completeInterviewSchema,
  registerSchema,
  startInterviewSchema,
  updateProfileSchema,
} from "../schemas/index.js";

describe("registerSchema", () => {
  it("normalises the email", () => {
    const parsed = registerSchema.parse({ email: "  Jane@Example.COM ", password: "longenough", name: "Jane" });
    expect(parsed.email).toBe("jane@example.com");
  });
  it("rejects short passwords", () => {
    expect(registerSchema.safeParse({ email: "a@b.co", password: "short", name: "A" }).success).toBe(false);
  });
});

describe("startInterviewSchema", () => {
  const valid = { role: "Frontend Developer", interviewType: "mixed", technologies: ["React", "TypeScript"] };

  it("accepts valid input", () => {
    expect(startInterviewSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects unknown roles", () => {
    expect(startInterviewSchema.safeParse({ ...valid, role: "Wizard" }).success).toBe(false);
  });
  it("rejects technologies that do not belong to the role", () => {
    expect(startInterviewSchema.safeParse({ ...valid, technologies: ["Kubernetes"] }).success).toBe(false);
  });
  it("requires at least one technology", () => {
    expect(startInterviewSchema.safeParse({ ...valid, technologies: [] }).success).toBe(false);
  });
});

describe("completeInterviewSchema", () => {
  it("defaults the transcript to an empty array", () => {
    expect(completeInterviewSchema.parse({ interviewId: "abc" }).transcript).toEqual([]);
  });
  it("rejects oversized transcripts", () => {
    const transcript = Array.from({ length: 501 }, () => ({ speaker: "You", text: "x" }));
    expect(completeInterviewSchema.safeParse({ interviewId: "abc", transcript }).success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("allows clearing a field with an empty string", () => {
    expect(updateProfileSchema.parse({ role: "" })).toEqual({ role: "" });
  });
  it("rejects an empty update", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });
});
