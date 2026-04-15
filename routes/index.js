import express from "express";
import interviewRoutes from "./interview.routes.js";
import authRoutes from "./auth.routes.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getTokenBalance } from "../controllers/token.controller.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/interview", interviewRoutes);
router.get("/token", authenticate, getTokenBalance);

export default router;
