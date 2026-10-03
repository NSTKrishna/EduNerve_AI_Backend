import express from "express";
import authRoutes from "./auth.routes.js";
import interviewRoutes from "./interview.routes.js";
import tokenRoutes from "./token.routes.js";
import prisma from "../db/prisma.js";

const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ success: false, code: "DB_UNAVAILABLE", error: "Database unavailable" });
  }
});

router.use("/auth", authRoutes);
router.use("/interview", interviewRoutes);
router.use("/token", tokenRoutes);

export default router;
