import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/config.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function generateInterviewFeedback(interviewData) { 
  try {
    const { role, interviewType, technologies, transcript } = interviewData;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        maxOutputTokens: 4000,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const prompt = `
You are an expert technical interviewer. Analyze this interview transcript and provide detailed feedback.

Interview Details:
- Role: ${role}
- Interview Type: ${interviewType}
- Technologies: ${technologies.join(", ")}

Transcript:
${JSON.stringify(transcript, null, 2)}

Provide a comprehensive analysis in this exact JSON format:
{
  "feedback": "Overall detailed feedback about the candidate's performance (200-300 words)",
  "technicalScore": 75.5,
  "communicationScore": 80.0,
  "problemSolvingScore": 70.0,
  "overallScore": 75.0,
  "strengths": [
    "Clear explanation of React concepts",
    "Good understanding of async/await",
    "Excellent communication skills"
  ],
  "weakAreas": [
    "Struggled with system design questions",
    "Limited knowledge of database optimization",
    "Could improve on data structures complexity analysis"
  ],
  "detailedAnalysis": {
    "technical": "Analysis of technical knowledge demonstrated",
    "communication": "Analysis of communication style and clarity",
    "problemSolving": "Analysis of problem-solving approach"
  },
  "improvementAreas": [
    {
      "topic": "System Design",
      "priority": "high",
      "description": "Focus on scalability patterns and microservices architecture"
    },
    {
      "topic": "Database Optimization",
      "priority": "medium",
      "description": "Learn about indexing strategies and query optimization"
    }
  ]
}

Guidelines:
- Scores should be 0-100 (use decimals)
- Be specific and constructive
- Identify 3-5 strengths and 3-5 weak areas
- Provide actionable improvement suggestions
- Base analysis on actual transcript content
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();


    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/```\n?/g, "");
    }
    cleanText = cleanText.trim();

    const analysisData = JSON.parse(cleanText);

    if (!analysisData.feedback || !analysisData.overallScore) {
      throw new Error("Invalid AI response structure");
    }

    return analysisData;
  } catch (error) {
    console.error("Error generating interview feedback:", error);
    throw error;
  }
}

export async function generateResourceRecommendations(weakAreas, role, technologies) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        maxOutputTokens: 3000,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });  

    const prompt = `
You are a technical learning advisor. Generate learning resource recommendations.

Context:
- Target Role: ${role}
- Technologies: ${technologies.join(", ")}
- Weak Areas Identified: ${weakAreas.join(", ")}

Generate 8-12 high-quality learning resources in this exact JSON format:
{
  "recommendations": [
    {
      "category": "documentation",
      "topic": "React Hooks", 
      "title": "React Official Documentation - Hooks",
      "url": "https://react.dev/reference/react",
      "description": "Comprehensive guide to React Hooks with examples",
      "priority": 10
    },
    {
      "category": "video",
      "topic": "System Design",
      "title": "System Design Interview Course",
      "url": "https://www.youtube.com/watch?v=example",
      "description": "Complete system design fundamentals",
      "priority": 9
    },
    {
      "category": "article",
      "topic": "Database Optimization",
      "title": "SQL Query Optimization Guide",
      "url": "https://example.com/sql-optimization",
      "description": "Best practices for database performance",
      "priority": 8
    }
  ]
}

Guidelines:
- Provide REAL, working URLs (use official documentation, YouTube, Medium, dev.to, etc.)
- Categories: "documentation", "video", "article", "course"
- Priority: 1-10 (10 = highest priority)
- Focus on the identified weak areas
- Include mix of free and high-quality resources
- Prefer official documentation and reputable sources
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/```\n?/g, "");
    }
    cleanText = cleanText.trim();

    const recommendationsData = JSON.parse(cleanText);

    return recommendationsData.recommendations || [];
  } catch (error) {
    console.error("Error generating resource recommendations:", error);
    throw error;
  }
}
