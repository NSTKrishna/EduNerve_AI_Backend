import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/config.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function generateQuizQuestions(prompt, numberOfQuestions = 5) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        maxOutputTokens: 8000,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const finalPrompt = `
Generate ${numberOfQuestions} multiple-choice questions about ${prompt}.

Return a JSON object with this EXACT structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "answer": "Option 1"
    }
  ]
}

Rules:
- Generate EXACTLY ${numberOfQuestions} questions
- Each question MUST have exactly 4 options
- The answer MUST be one of the 4 options (exact text match)
- Questions should cover ${prompt}
- Mix difficulty levels
- ONLY return valid JSON, nothing else
`;

    const result = await model.generateContent(finalPrompt);
    const response = result.response;
    const text = response.text();

    console.log("Gemini response length:", text.length);

    let cleanText = text.trim();

    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/```\n?/g, "");
    }

    cleanText = cleanText.trim();

    let questionsData;
    try {
      questionsData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("JSON Parse error:", parseError.message);
      console.error("Raw text length:", text.length);
      console.error(
        "Clean text preview (first 500 chars):",
        cleanText.substring(0, 500)
      );
      console.error(
        "Clean text preview (last 500 chars):",
        cleanText.substring(cleanText.length - 500)
      );

      try {
        if (!cleanText.endsWith("}") && !cleanText.endsWith("]")) {
          const lastCompleteQuestionMatch = cleanText.lastIndexOf("    }");
          if (lastCompleteQuestionMatch > 0) {
            cleanText =
              cleanText.substring(0, lastCompleteQuestionMatch + 5) +
              "\n  ]\n}";
            console.log("Attempting to fix incomplete JSON...");
            questionsData = JSON.parse(cleanText);
          } else {
            throw parseError;
          }
        } else {
          throw parseError;
        }
      } catch (fixError) {
        console.error("Failed to fix JSON:", fixError.message);
        throw new Error(
          `Invalid JSON response from Gemini AI. Parse error: ${parseError.message}`
        );
      }
    }

    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      throw new Error("Invalid questions format - missing questions array");
    }

    if (questionsData.questions.length === 0) {
      throw new Error("No questions were generated");
    }

    const validQuestions = [];
    questionsData.questions.forEach((q, index) => {
      try {
        if (!q.question || !q.options || !q.answer) {
          console.warn(
            `Question ${index + 1} is missing required fields, skipping`
          );
          return;
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          console.warn(
            `Question ${index + 1} must have exactly 4 options, skipping`
          );
          return;
        }
        if (!q.options.includes(q.answer)) {
          console.warn(
            `Question ${index + 1} answer doesn't match options, skipping`
          );
          return;
        }
        validQuestions.push(q);
      } catch (err) {
        console.warn(`Error validating question ${index + 1}:`, err.message);
      }
    });

    if (validQuestions.length === 0) {
      throw new Error("No valid questions were generated");
    }

    console.log(
      `Generated ${validQuestions.length} valid questions out of ${questionsData.questions.length} total`
    );

    return { questions: validQuestions };
  } catch (error) {
    console.error("Error generating quiz questions:", error);
    throw error;
  }
}
