import express from "express";
import { 
  createQuiz, 
  getAllQuizzes, 
  getQuizById, 
  deleteQuiz,
  generateQuiz,
  saveQuizResult
} from "../controllers/quiz.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create", createQuiz);
router.post("/generate-quiz", generateQuiz);
router.post("/save-quiz-result", optionalAuth, saveQuizResult);
router.get("/", getAllQuizzes);
router.get("/:id", getQuizById);
router.delete("/:id", deleteQuiz);

export default router; 
