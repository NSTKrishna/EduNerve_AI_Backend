import express from "express";
import * as auth from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../schemas/index.js";

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), auth.register);
router.post("/login", authLimiter, validate(loginSchema), auth.login);

router.use(authenticate);
router.get("/profile", auth.getProfile);
router.put("/profile", validate(updateProfileSchema), auth.updateProfile);
router.put("/password", authLimiter, validate(changePasswordSchema), auth.changePassword);
router.delete("/me", authLimiter, validate(deleteAccountSchema), auth.deleteAccount);
router.get("/dashboard", auth.getDashboard);

export default router;
