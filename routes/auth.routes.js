import express from "express";
import { register, login, getProfile, updateProfile, googleAuth } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);

router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);

export default router;
