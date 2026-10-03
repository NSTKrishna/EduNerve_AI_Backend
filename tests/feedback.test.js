import { describe, expect, it } from "vitest";
import {
  deriveOverallScore,
  fallbackFeedback,
  formatTranscript,
  normalizeFeedback,
  parseJsonObject,
  toScore,
} from "../services/feedback.service.js";

describe("parseJsonObject", () => {
  it("parses plain JSON", () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips code fences and surrounding text", () => {
    expect(parseJsonObject('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("returns null for garbage, arrays and empty input", () => {
    expect(parseJsonObject("not json")).toBeNull();
    expect(parseJsonObject("[1,2]")).toBeNull();
    expect(parseJsonObject("")).toBeNull();
    expect(parseJsonObject("{broken")).toBeNull();
  });
});

describe("toScore", () => {
  it("clamps to 0-10 and rounds to one decimal", () => {
    expect(toScore(15)).toBe(10);
    expect(toScore(-3)).toBe(0);
    expect(toScore("7.46")).toBe(7.5);
  });
  it("treats missing / invalid values as null, not 0", () => {
    expect(toScore(null)).toBeNull();
    expect(toScore(undefined)).toBeNull();
    expect(toScore("")).toBeNull();
    expect(toScore("abc")).toBeNull();
  });
});

describe("normalizeFeedback", () => {
  it("maps a model response to the stored shape", () => {
    const result = normalizeFeedback({
      feedback: "Nice work",
      scores: { technical: 8, communication: 6, problemSolving: 7, overall: 7 },
      strengths: ["Clear"],
      weakAreas: ["Depth"],
      detailedAnalysis: { summary: "ok", notes: ["a", "b"] },
    });
    expect(result).toMatchObject({
      source: "ai",
      technicalScore: 8,
      overallScore: 7,
      strengths: ["Clear"],
      weakAreas: ["Depth"],
    });
    expect(result.detailedAnalysis.notes).toEqual(["a", "b"]);
  });

  it("derives the overall score when the model omits it", () => {
    const result = normalizeFeedback({ scores: { technical: 8, communication: 6, problemSolving: 7 } });
    expect(result.overallScore).toBe(7);
  });

  it("survives a malformed response", () => {
    const result = normalizeFeedback({ scores: "high", strengths: "x", detailedAnalysis: 5 });
    expect(result.technicalScore).toBeNull();
    expect(result.strengths).toEqual([]);
    expect(result.detailedAnalysis.notes).toEqual([]);
  });
});

describe("deriveOverallScore", () => {
  it("is null when there is nothing to average", () => {
    expect(
      deriveOverallScore({ modelOverall: null, technicalScore: null, communicationScore: null, problemSolvingScore: null }),
    ).toBeNull();
  });
});

describe("fallbackFeedback", () => {
  it("is flagged as fallback and invents no scores", () => {
    const result = fallbackFeedback({ role: "Backend Developer", interviewType: "mixed" });
    expect(result.source).toBe("fallback");
    expect(result.overallScore).toBeNull();
    expect(result.technicalScore).toBeNull();
  });
});

describe("formatTranscript", () => {
  const turns = [
    { speaker: "Interviewer", text: "Hello" },
    { speaker: "You", text: "Hi there" },
  ];
  it("labels speakers", () => {
    expect(formatTranscript(turns)).toBe("Interviewer: Hello\nCandidate: Hi there");
  });
  it("drops the oldest turns first when too long", () => {
    const long = Array.from({ length: 50 }, (_, i) => ({ speaker: "You", text: `turn-${i} ${"x".repeat(100)}` }));
    const out = formatTranscript(long, 500);
    expect(out).toContain("turn-49");
    expect(out).not.toContain("turn-0 ");
    expect(out.length).toBeLessThanOrEqual(520);
  });
  it("handles non-array input", () => {
    expect(formatTranscript(undefined)).toBe("");
  });
});
