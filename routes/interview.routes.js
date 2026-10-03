import express from "express";
import * as interview from "../controllers/interview.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { interviewLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  completeInterviewSchema,
  historyQuerySchema,
  startInterviewSchema,
} from "../schemas/index.js";

const router = express.Router();

router.use(authenticate);

// Static paths first: `/:interviewId` would otherwise swallow them.
router.get("/options", interview.getOptions);
router.get("/user/history", validate(historyQuerySchema, "query"), interview.getUserInterviews);

router.post("/start-interview", interviewLimiter, validate(startInterviewSchema), interview.startInterview);
router.post("/complete", interviewLimiter, validate(completeInterviewSchema), interview.completeInterview);

router.get("/:interviewId", interview.getInterview);

export default router;
