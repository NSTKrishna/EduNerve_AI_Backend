import prisma from "../db/config.js";
import { generateQuizQuestions } from "../services/quiz.service.js";

export async function createQuiz(req, res, next) {
  try {
    const { prompt } = req.body;
     
    if (!prompt) {
      return res.status(400).json({ 
        success: false,
        error: "Prompt is required" 
      });  
    }

    const quizData = await generateQuizQuestions(prompt);

    const savedQuizzes = [];
    for (const question of quizData.questions) {
      const quiz = await prisma.quiz.create({
        data: {
          question: question.question,
          options: question.options,
          answer: question.answer,
        },
      });
      savedQuizzes.push(quiz);
    }

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      prompt: prompt,
      questions: quizData.questions,
      savedQuizzes: savedQuizzes,
    });
  } catch (err) {
    console.error("Error creating quiz:", err);
    next(err);
  }
}

export async function generateQuiz(req, res, next) {
  try {
    const { prompt, numberOfQuestions } = req.body;
     
    if (!prompt) {
      return res.status(400).json({ 
        success: false,
        error: "Prompt is required" 
      });  
    }

    const numQuestions = numberOfQuestions || 10;

    const quizData = await generateQuizQuestions(prompt, numQuestions);

    res.status(200).json({
      success: true,
      questions: quizData.questions,
      total: quizData.questions.length
    });
  } catch (err) {
    console.error("Error generating quiz:", err);
    next(err);
  }
}

export async function saveQuizResult(req, res, next) {
  try {
    const { category, subtopics, score, total, percentage, level } = req.body;
    const userId = req.user?.id || null; // Get userId from auth middleware if available
     
    if (!category || score === undefined || !total || percentage === undefined || !level) {
      return res.status(400).json({ 
        success: false,
        error: "Category, score, total, percentage, and level are required" 
      });  
    }

    const result = await prisma.quizResult.create({
      data: {
        userId,
        category,
        subtopics: subtopics || [],
        score,
        total,
        percentage,
        level,
      },
    });

    res.status(201).json({
      success: true,
      message: "Quiz result saved successfully",
      result
    });
  } catch (err) {
    console.error("Error saving quiz result:", err);
    next(err);
  }
}

export async function getAllQuizzes(req, res, next) {
  try {
    const quizzes = await prisma.quiz.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({ 
      success: true,
      count: quizzes.length, 
      quizzes 
    });
  } catch (err) {
    console.error("Error fetching quizzes:", err);
    next(err);
  }
}

export async function getQuizById(req, res, next) {
  try {
    const { id } = req.params;
    
    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found"
      });
    }
    
    res.json({
      success: true,
      quiz
    });
  } catch (err) {
    console.error("Error fetching quiz:", err);
    next(err);
  }
}

export async function deleteQuiz(req, res, next) {
  try {
    const { id } = req.params;
    
    await prisma.quiz.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({
      success: true,
      message: "Quiz deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting quiz:", err);
    next(err);
  }
} 