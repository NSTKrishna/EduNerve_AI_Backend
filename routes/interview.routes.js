import express from "express";
import {
  startInterview,
  completeInterview,
  getInterview,
  getUserInterviews,
  healthCheck,
} from "../controllers/interview.controller.js";
import { validateInterviewRequest } from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { Token, getTokenBalance } from "../controllers/token.controller.js";

const router = express.Router();

// Health check route
router.get("/health", healthCheck);

// Start interview route (requires authentication)
router.post(
  "/start-interview",
  authenticate,
  Token,
  validateInterviewRequest,
  startInterview,
);

// Complete interview and get feedback
router.post("/complete", authenticate, completeInterview);

// Get user's interview history (requires auth)
router.get("/user/history", authenticate, getUserInterviews);

router.get("/token", authenticate, getTokenBalance);

// Get specific interview
router.get("/:interviewId", getInterview);

export default router;
