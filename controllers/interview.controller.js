import { generateInterviewPrompt } from "../services/gemini.service.js";
import { buildInterviewConfig } from "../utils/interview.utils.js";
import { generateInterviewFeedback, generateResourceRecommendations } from "../services/feedback.service.js";
import prisma from "../db/config.js";
import config from "../config/config.js";

export const startInterview = async (req, res, next) => {
  try {  
    const { role, interviewType, technologies } = req.body;
    const userId = req.user?.userId; 

    console.log("Generating interview prompt with Gemini for:", {
      role,
      interviewType,
      technologies, 
    });

    const systemPrompt = await generateInterviewPrompt({
      role,
      interviewType,
      technologies,
    });

    console.log("Generated prompt:", systemPrompt.substring(0, 200) + "...");

    let interview = null;
    if (userId) {
      interview = await prisma.interview.create({
        data: {
          userId,
          role,
          interviewType,
          technologies,
          status: "in_progress"
        }
      });
    }

    const interviewConfig = buildInterviewConfig(interviewType);

    res.json({
      success: true,
      publicKey: config.vapiPublicKey,
      role,
      interviewType,
      technologies,
      interviewId: interview?.id,
      systemPrompt,
      interviewConfig,
    }); 
  } catch (error) {
    console.error("Error in startInterview controller:", error);
    next(error);
  }
};

export const completeInterview = async (req, res, next) => {
  try {
    const { interviewId, transcript, duration } = req.body;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        error: "Interview ID is required"
      });
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: "Interview not found"
      });
    }

    console.log("Generating AI feedback for interview:", interviewId);
    const feedbackData = await generateInterviewFeedback({
      role: interview.role,
      interviewType: interview.interviewType,
      technologies: interview.technologies,
      transcript: transcript || []
    });

    console.log("Generating resource recommendations...");
    const recommendations = await generateResourceRecommendations(
      feedbackData.weakAreas || [],
      interview.role,
      interview.technologies
    );

    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: "completed",
        completedAt: new Date(),
        duration: duration || null,
        transcript: transcript || [],
        aiAnalysis: feedbackData.detailedAnalysis || {},
        feedback: feedbackData.feedback,
        technicalScore: feedbackData.technicalScore,
        communicationScore: feedbackData.communicationScore,
        problemSolvingScore: feedbackData.problemSolvingScore,
        overallScore: feedbackData.overallScore,
        weakAreas: feedbackData.weakAreas || [],
        strengths: feedbackData.strengths || []
      }
    });

    const savedRecommendations = await Promise.all(
      recommendations.map(rec =>
        prisma.recommendation.create({
          data: {
            interviewId,
            category: rec.category,
            topic: rec.topic,
            title: rec.title,
            url: rec.url,
            description: rec.description || "",
            priority: rec.priority || 5
          }
        })
      )
    );

    res.json({
      success: true,
      message: "Interview completed and analyzed successfully",
      interview: updatedInterview,
      feedback: feedbackData,
      recommendations: savedRecommendations
    });
  } catch (error) {
    console.error("Error in completeInterview:", error);
    next(error);
  }
};

export const getInterview = async (req, res, next) => {
  try {
    const { interviewId } = req.params;

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        recommendations: {
          orderBy: {
            priority: 'desc'
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: "Interview not found"
      });
    }

    res.json({
      success: true,
      interview
    });
  } catch (error) {
    console.error("Error in getInterview:", error);
    next(error);
  }
};

export const getUserInterviews = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const interviews = await prisma.interview.findMany({
      where: { userId },
      include: {
        recommendations: {
          take: 3,
          orderBy: { priority: 'desc' }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    res.json({
      success: true,
      count: interviews.length,
      interviews
    });
  } catch (error) {
    console.error("Error in getUserInterviews:", error);
    next(error);
  }
};

export const healthCheck = (req, res) => {
  res.json({
    success: true,
    message: "AI Mock Interview API is running",
    timestamp: new Date().toISOString(),
  });
};
