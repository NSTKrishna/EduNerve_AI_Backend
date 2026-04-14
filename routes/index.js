import express from "express";
import interviewRoutes from "./interview.routes.js";
import authRoutes from "./auth.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/interview", interviewRoutes);

export default router;
