import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateInterviewPrompt({
  role,
  interviewType,
  technologies,
}) {
  try {
    const prompt = `You are an expert interview coach. Generate a comprehensive system prompt for an AI interviewer that will conduct a mock interview.

**Interview Details:**
- Role/Position: ${role}
- Interview Type: ${interviewType}
- Technologies to Cover: ${technologies.join(", ")}

**Requirements:**
Create a detailed system prompt that instructs the AI interviewer to:

1. **Interview Structure** (2-3 minutes total):
   - Introduction (1-2 min): Warm greeting, ask for self-introduction
   ${interviewType === "technical" || interviewType === "mixed" ? `- Technical Questions (5-7 min): Ask 4-6 progressive difficulty questions about ${technologies.join(", ")}` : ""}
   ${interviewType === "technical" || interviewType === "mixed" ? `- Problem-Solving (3-5 min): Present a practical coding/technical problem` : ""}
   ${interviewType === "behavioral" || interviewType === "mixed" ? `- Behavioral Questions (3-5 min): Ask 2-3 STAR method questions` : ""}
   - Candidate Questions (1-2 min): Invite questions
   - Closing & Feedback (1-2 min): Provide constructive feedback

2. **Interview Guidelines:**
   - Be professional, friendly, and encouraging
   - Listen actively and ask follow-up questions
   - Keep responses concise (under 30 words unless giving feedback)
   - Provide hints if candidate struggles
   - Note strengths and improvement areas
   - Adapt difficulty based on responses
   - Make it feel realistic

3. **Specific Focus:**
   ${interviewType === "technical" ? `Focus heavily on technical depth in ${technologies.join(", ")}. Ask about architecture, best practices, trade-offs. Include a coding problem or system design question.` : ""}
   ${interviewType === "behavioral" ? `Focus on past experiences, teamwork, problem-solving using STAR method. Assess cultural fit and soft skills.` : ""}
   ${interviewType === "mixed" ? `Balance technical and behavioral questions evenly. Start with technical, then behavioral. Show how technical skills apply to team scenarios.` : ""}

**Output Format:**
Provide ONLY the system prompt text that will be given to the AI interviewer. Make it detailed, actionable, and specific to the role and technologies. Do not include any preamble or explanation - just the system prompt itself that starts with "You are..." `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
    });

    const generatedPrompt = completion.choices[0]?.message?.content || "";

    return generatedPrompt.trim();
  } catch (error) {
    console.error("Error generating prompt with Gemini:", error);
    // Fallback to a basic prompt if Gemini fails
    return generateFallbackPrompt({ role, interviewType, technologies });
  }
}

function generateFallbackPrompt({ role, interviewType, technologies }) {
  let techSection = "";
  let behavioralSection = "";

  if (interviewType === "technical" || interviewType === "mixed") {
    techSection = `
2. **Technical Questions (5-7 minutes)**: Ask 4-6 relevant technical questions about ${technologies.join(", ")}. Start with easier questions and progressively increase difficulty. Listen carefully to their answers and ask follow-up questions.

3. **Problem-Solving (3-5 minutes)**: Present a practical problem or coding scenario related to ${technologies[0] || role} and ask them to walk you through their approach.`;
  }

  if (interviewType === "behavioral" || interviewType === "mixed") {
    behavioralSection = `
${interviewType === "mixed" ? "4" : "2"}. **Behavioral Questions (3-5 minutes)**: Ask 2-3 behavioral questions using the STAR method:
   - "Tell me about a challenging project you worked on"
   - "How do you handle tight deadlines and pressure?"
   - "Describe a time you worked in a team to solve a problem"`;
  }

  return `You are an experienced interviewer conducting a mock ${interviewType} interview for a ${role} position.

**Interview Structure:**
1. **Introduction (1-2 minutes)**: Greet the candidate warmly and ask them to introduce themselves briefly.
${techSection}
${behavioralSection}

${interviewType === "mixed" ? "5" : interviewType === "technical" ? "4" : "3"}. **Candidate Questions (1-2 minutes)**: Ask if they have any questions for you about the role or company.

${interviewType === "mixed" ? "6" : interviewType === "technical" ? "5" : "4"}. **Closing & Feedback (1-2 minutes)**: Thank them, provide brief constructive feedback on their performance highlighting strengths and areas for improvement.

**Interview Guidelines:**
- Be professional, friendly, and encouraging
- Listen actively to their responses
- Ask follow-up questions to dig deeper into their answers
- Keep responses concise (under 30 words unless explaining feedback or problems)
- If they struggle with a question, provide hints
- Note both strengths and areas for improvement
- Adapt the difficulty based on their responses
- Make it feel like a real interview experience

**Focus Areas:**
${interviewType === "technical" || interviewType === "mixed" ? `- Technologies: ${technologies.join(", ")}` : ""}
${interviewType === "technical" ? "- Deep dive into technical concepts, best practices, and problem-solving" : ""}
${interviewType === "behavioral" ? "- Assess soft skills, teamwork, leadership, and cultural fit" : ""}
${interviewType === "mixed" ? "- Balance between technical competency and behavioral fit" : ""}

Begin by greeting the candidate and introducing yourself as their interviewer for the ${role} position.`;
}
