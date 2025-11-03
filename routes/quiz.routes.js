import express from "express";
import { 
  createQuiz, 
  getAllQuizzes, 
  getQuizById, 
  deleteQuiz,
  generateQuiz,
  saveQuizResult
} from "../controllers/quiz.controller.js";

const router = express.Router();

router.post("/create", createQuiz);
router.post("/generate", generateQuiz);
router.post("/result", saveQuizResult);
router.get("/", getAllQuizzes);
router.get("/:id", getQuizById);
router.delete("/:id", deleteQuiz);

export default router; 
