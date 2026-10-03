import { asyncHandler } from "../utils/asyncHandler.js";
import * as interviews from "../services/interview.service.js";

export const getOptions = (req, res) => {
  res.json({ success: true, ...interviews.getOptions() });
};

export const startInterview = asyncHandler(async (req, res) => {
  const result = await interviews.startInterview(req.user.userId, req.body);
  res.json({ success: true, ...result });
});

export const completeInterview = asyncHandler(async (req, res) => {
  const result = await interviews.completeInterview(req.user.userId, req.body);
  const messages = {
    none: "Interview ended without any answers, so your tokens were refunded",
    fallback: "Interview saved, but AI feedback was unavailable",
    ai: "Interview completed and analyzed successfully",
  };
  const message = messages[result.feedbackStatus];
  res.json({ success: true, message, ...result });
});

export const getInterview = asyncHandler(async (req, res) => {
  const interview = await interviews.getInterview(req.user.userId, req.params.interviewId);
  res.json({ success: true, interview });
});

export const getUserInterviews = asyncHandler(async (req, res) => {
  const { interviews: rows, total, nextCursor } = await interviews.listInterviews(
    req.user.userId,
    req.validatedQuery,
  );
  res.json({ success: true, count: rows.length, total, nextCursor, interviews: rows });
});
