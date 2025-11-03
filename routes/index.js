import express from "express";
import interviewRoutes from "./interview.routes.js";
import quizRoutes from "./quiz.routes.js";
import authRoutes from "./auth.routes.js";
import resourceRoutes from "./resource.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/", interviewRoutes);
router.use("/quiz", quizRoutes);
router.use("/resources", resourceRoutes);

export default router;
