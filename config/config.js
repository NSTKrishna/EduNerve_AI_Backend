import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  vapiPublicKey: process.env.VAPI_PUBLIC_KEY,
  vapiSecretKey: process.env.VAPI_SECRET_KEY,
  googleApiKey: process.env.GEMINI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
  nodeEnv: process.env.NODE_ENV || "development",
};

export default config;
