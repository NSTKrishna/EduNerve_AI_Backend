import express from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  getDashboard,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/profile", authenticate, getProfile);
router.get("/dashboard", authenticate, getDashboard);
router.put("/profile", authenticate, updateProfile);

export default router;
