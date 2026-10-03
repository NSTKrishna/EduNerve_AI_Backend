import config from "../config/config.js";

const buildInterviewSections = (interviewType) => {
  const sections = ["Introduction"];

  if (interviewType === "technical" || interviewType === "mixed") {
    sections.push("Technical Questions", "Problem Solving");
  }
  if (interviewType === "behavioral" || interviewType === "mixed") {
    sections.push("Behavioral Questions");
  }

  sections.push("Q&A", "Feedback");
  return sections;
};

export const buildInterviewConfig = (interviewType) => {
  const durationMinutes = config.interview.durationMinutes;
  return {
    type: "mock_interview",
    durationMinutes,
    durationSeconds: durationMinutes * 60,
    sections: buildInterviewSections(interviewType),
  };
};

/**
 * Vapi assistant definition. Owned by the backend so the model / voice can be
 * changed without redeploying the frontend.
 */
export const buildAssistantConfig = ({ role, systemPrompt }) => ({
  name: `${role} Interview`,
  model: {
    provider: "openai",
    model: config.vapiModel,
    messages: [{ role: "system", content: systemPrompt }],
  },
  voice: { provider: "11labs", voiceId: config.vapiVoiceId },
  firstMessage: `Hello! I'm your AI interviewer for the ${role} position. Whenever you're ready, please introduce yourself.`,
  // A minute of grace past the planned length, then Vapi hangs up.
  maxDurationSeconds: config.interview.durationMinutes * 60 + 60,
});
