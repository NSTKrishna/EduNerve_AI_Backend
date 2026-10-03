import express from "express";
import cors from "cors";
import helmet from "helmet";
import config from "./config/config.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";
import { requestLogger } from "./utils/logger.js";

const app = express();

if (config.trustProxy) app.set("trust proxy", config.trustProxy);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://edu-nerve-ai-frontend.vercel.app",
  "https://edu-nerve-ai-frontend-liard.vercel.app",
  ...config.corsOrigins,
]);
// Vercel preview deployments of this project: edu-nerve-ai-frontend-<hash>-nstkrishnas-projects.vercel.app
const previewOrigin = /^https:\/\/edu-nerve-ai-frontend(-[a-z0-9]+)?-nstkrishnas-projects\.vercel\.app$/;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.has(origin) || previewOrigin.test(origin)),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  }),
);

if (config.nodeEnv === "development") app.use(requestLogger);

// Transcripts are the only large payload; everything else stays small.
app.use("/api/interview/complete", express.json({ limit: "1mb" }));
app.use("/api/v1/interview/complete", express.json({ limit: "1mb" }));
app.use(express.json({ limit: "100kb" }));

app.use("/api", apiLimiter);
app.use("/api/v1", routes);
app.use("/api", routes); // un-versioned alias used by the current frontend

app.get("/", (req, res) => {
  res.json({ success: true, message: "EduNerve AI Mock Interview API", docs: "See API_CONTRACT.md" });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
