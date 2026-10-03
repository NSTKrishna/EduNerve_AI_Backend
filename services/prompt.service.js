import config from "../config/config.js";
import { complete, llmAvailable } from "./llm.service.js";
import { logger } from "../utils/logger.js";

const CACHE_LIMIT = 200;
const cache = new Map();

const cacheKey = ({ role, interviewType, technologies }) =>
  [role, interviewType, [...technologies].sort().join(",")].join("|");

const remember = (key, value) => {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, value);
};

/**
 * System prompt for the voice interviewer. The prompt only depends on
 * (role, type, technologies), so generated prompts are cached; if the LLM
 * is unavailable the deterministic template below is used.
 */
export async function generateInterviewPrompt(input) {
  const key = cacheKey(input);
  if (cache.has(key)) return cache.get(key);

  let prompt = "";
  if (llmAvailable) {
    try {
      prompt = await complete({ prompt: buildMetaPrompt(input), maxTokens: 2500 });
    } catch (error) {
      logger.warn("Prompt generation failed, using template:", error.message);
    }
  }

  if (!prompt) return generateFallbackPrompt(input); // not cached, so the LLM is retried next time

  remember(key, prompt);
  return prompt;
}

function buildMetaPrompt({ role, interviewType, technologies }) {
  const minutes = config.interview.durationMinutes;
  const tech = technologies.join(", ");
  const technical = interviewType === "technical" || interviewType === "mixed";
  const behavioral = interviewType === "behavioral" || interviewType === "mixed";

  return `You are an expert interview coach. Write the system prompt for an AI voice interviewer who will run a mock interview.

Interview details:
- Role: ${role}
- Type: ${interviewType}
- Technologies: ${tech}

The interview lasts about ${minutes} minutes in total. The prompt you write must instruct the interviewer to:
1. Open with a warm greeting and ask the candidate to introduce themselves (about 1 minute).
${technical ? `2. Ask 3-5 progressively harder technical questions about ${tech}, then present one practical problem to talk through.\n` : ""}${behavioral ? `${technical ? "3" : "2"}. Ask 2-3 behavioral questions answered in STAR format.\n` : ""}- Leave a minute for candidate questions, then close with brief, constructive feedback.
- Be professional, friendly and encouraging; ask follow-up questions; give a hint if the candidate is stuck.
- Keep every turn under 30 words unless explaining a problem or giving final feedback (this is a voice call).
- Watch the clock and wrap up before the ${minutes} minutes are over.

Output ONLY the system prompt text, starting with "You are", with no preamble or explanation.`;
}

function generateFallbackPrompt({ role, interviewType, technologies }) {
  const minutes = config.interview.durationMinutes;
  const tech = technologies.join(", ");
  const steps = ["**Introduction (1 minute)**: Greet the candidate warmly and ask them to introduce themselves."];

  if (interviewType === "technical" || interviewType === "mixed") {
    steps.push(
      `**Technical questions**: Ask 3-5 relevant questions about ${tech}, starting easy and getting harder. Follow up on their answers.`,
      `**Problem solving**: Give one practical problem related to ${technologies[0] || role} and ask them to walk through their approach.`,
    );
  }
  if (interviewType === "behavioral" || interviewType === "mixed") {
    steps.push(
      `**Behavioral questions**: Ask 2-3 STAR-style questions (a challenging project, working under a deadline, resolving a team conflict).`,
    );
  }
  steps.push(
    "**Candidate questions (1 minute)**: Ask whether they have questions about the role.",
    "**Closing**: Thank them and give brief, constructive feedback on strengths and areas to improve.",
  );

  return `You are an experienced interviewer conducting a mock ${interviewType} interview for a ${role} position. The whole interview should take about ${minutes} minutes; wrap up before that time is over.

**Structure:**
${steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

**Guidelines:**
- Be professional, friendly and encouraging.
- This is a voice call: keep each turn under 30 words unless explaining a problem or giving final feedback.
- Ask follow-up questions; give hints if the candidate struggles.
- Adapt the difficulty to how they answer and make it feel like a real interview.

Begin by greeting the candidate and introducing yourself as their interviewer for the ${role} position.`;
}
