import express from "express";
import { 
  startInterview, 
  completeInterview,
  getInterview,
  getUserInterviews,
  healthCheck 
} from "../controllers/interview.controller.js";
import { validateInterviewRequest } from "../middlewares/validation.middleware.js";
import { authenticate, optionalAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Health check route
router.get("/health", healthCheck);

// Start interview route (optional auth - can work without login)
router.post("/start-interview", optionalAuth, validateInterviewRequest, startInterview);

// Complete interview and get feedback
router.post("/complete", completeInterview);

// Get specific interview with recommendations
router.get("/:interviewId", getInterview);

// Get user's interview history (requires auth)
router.get("/user/history", authenticate, getUserInterviews);

export default router;
