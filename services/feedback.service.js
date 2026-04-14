import Groq from "groq-sdk";
import config from "../config/config.js";

const groq = new Groq({
  apiKey: config.groqApiKey || process.env.GROQ_API_KEY,
});

/**
 * Contract:
 * Input: { role, interviewType, technologies: string[], transcript: any }
 * Output: {
 *  feedback: string,
 *  detailedAnalysis: object,
 *  technicalScore?: number,
 *  communicationScore?: number,
 *  problemSolvingScore?: number,
 *  overallScore?: number,
 *  strengths: string[],
 *  weakAreas: string[]
 * }
 */
export async function generateInterviewFeedback({
  role,
  interviewType,
  technologies,
  transcript,
}) {
  const safeTech = Array.isArray(technologies) ? technologies : [];
  const safeTranscript = transcript ?? [];

  // If GROQ key isn’t configured, return a deterministic fallback so dashboard still works.
  if (!groq?.apiKey) {
    return fallbackFeedback({ role, interviewType, technologies: safeTech });
  }

  const prompt = `You are an interview evaluator.

Evaluate this mock interview and return ONLY valid JSON.

Context:
- Role: ${role}
- Interview type: ${interviewType}
- Technologies: ${safeTech.join(", ") || "N/A"}

Transcript (may be array or object):
${JSON.stringify(safeTranscript).slice(0, 12000)}

Return JSON in exactly this shape:
{
  "feedback": "string",
  "scores": {
    "technical": 0-10,
    "communication": 0-10,
    "problemSolving": 0-10,
    "overall": 0-10
  },
  "strengths": ["..."],
  "weakAreas": ["..."],
  "detailedAnalysis": {
    "summary": "string",
    "notes": ["..."]
  }
}

Rules:
- Scores must be numbers.
- strengths/weakAreas must be arrays of strings.
- detailedAnalysis must be an object.
- Output ONLY JSON, no markdown.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.3-70b-versatile",
    temperature: 0.4,
    max_tokens: 2000,
  });

  let text = completion.choices[0]?.message?.content || "";
  text = text.trim();
  if (text.startsWith("```")) {
    text = text
      .replace(/^```(json)?\n?/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Hard fallback if the model didn’t comply.
    return fallbackFeedback({ role, interviewType, technologies: safeTech });
  }

  const scores = parsed?.scores || {};

  const technicalScore = toScore(scores.technical);
  const communicationScore = toScore(scores.communication);
  const problemSolvingScore = toScore(scores.problemSolving);
  const overallScore = deriveOverallScore({
    modelOverall: toScore(scores.overall),
    technicalScore,
    communicationScore,
    problemSolvingScore,
  });

  const detailedAnalysis =
    parsed?.detailedAnalysis && typeof parsed.detailedAnalysis === "object"
      ? parsed.detailedAnalysis
      : { summary: "", notes: [] };

  return {
    feedback: String(parsed?.feedback || ""),
    // Stored into Interview.aiAnalysis
    detailedAnalysis: {
      ...detailedAnalysis,
      generatedAt: new Date().toISOString(),
      rubric: {
        scale: "0-10",
        fields: [
          "technicalScore",
          "communicationScore",
          "problemSolvingScore",
          "overallScore",
        ],
      },
      scores: {
        technical: technicalScore,
        communication: communicationScore,
        problemSolving: problemSolvingScore,
        overall: overallScore,
      },
    },
    technicalScore,
    communicationScore,
    problemSolvingScore,
    overallScore,
    strengths: Array.isArray(parsed?.strengths)
      ? parsed.strengths.map(String)
      : [],
    weakAreas: Array.isArray(parsed?.weakAreas)
      ? parsed.weakAreas.map(String)
      : [],
  };
}

function toScore(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(10, n));
}

function deriveOverallScore({
  modelOverall,
  technicalScore,
  communicationScore,
  problemSolvingScore,
}) {
  // Prefer model-provided overall if valid.
  if (typeof modelOverall === "number") return modelOverall;

  const parts = [
    technicalScore,
    communicationScore,
    problemSolvingScore,
  ].filter((v) => typeof v === "number");

  if (parts.length === 0) return null;
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  return Math.round(avg * 10) / 10; // one decimal
}

function fallbackFeedback({ role, interviewType, technologies }) {
  const tech = technologies?.length
    ? technologies.join(", ")
    : "your target stack";
  return {
    feedback: `Good effort overall. For a ${role} ${interviewType} interview, focus on clearer explanations and more structured answers.`,
    detailedAnalysis: {
      summary: `Fallback analysis (AI key missing). Consider revising ${tech} fundamentals and practicing concise communication.`,
      notes: [
        "Use STAR format for behavioral answers.",
        "Explain trade-offs and edge cases in technical answers.",
        "Practice thinking aloud during problem solving.",
      ],
    },
    technicalScore: 6,
    communicationScore: 6,
    problemSolvingScore: 6,
    overallScore: 6,
    strengths: ["Willingness to engage", "Basic understanding"],
    weakAreas: ["Depth in key topics", "Answer structure"],
  };
}
