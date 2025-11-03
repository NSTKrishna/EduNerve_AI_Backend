import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/validation.middleware.js";

const app = express();

app.use(cors());
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
      health: "GET /api/health",
      startInterview: "POST /api/start-interview",
    },
  });
});
app.use(notFoundHandler);

app.use(errorHandler);

export default app;
