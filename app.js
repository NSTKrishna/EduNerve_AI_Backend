import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/validation.middleware.js";

const app = express();

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    // Vercel deployments (preview + production)
    "https://edu-nerve-ai-frontend.vercel.app",
    "https://edu-nerve-ai-frontend-liard.vercel.app",
    "https://edu-nerve-ai-frontend-loaznc6p4-nstkrishnas-projects.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Length", "X-Requested-With"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
  });
}

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to EduNerve AI Mock Interview API",
    version: "1.0.0",
    endpoints: {
      interviewHealth: "GET /api/interview/health",
      startInterview: "POST /api/interview/start-interview",
      completeInterview: "POST /api/interview/complete",
      authRegister: "POST /api/auth/register",
      authLogin: "POST /api/auth/login",
      authProfile: "GET /api/auth/profile",
      authDashboard: "GET /api/auth/dashboard",
    },
  });
});
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
