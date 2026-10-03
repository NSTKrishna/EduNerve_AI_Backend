import rateLimit from "express-rate-limit";

const limiter = (options) =>
  rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        error: "Too many requests. Please try again later.",
      }),
    ...options,
  });

export const apiLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 600 });
// Brute-force protection for login / register / password change.
export const authLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 30 });
// Every interview start calls the LLM, every completion calls it again.
export const interviewLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 30 });
