import dotenv from "dotenv";

dotenv.config();

const env = process.env;
const nodeEnv = env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

// Always required. Production additionally requires the AI + voice keys.
const required = ["JWT_SECRET", "DATABASE_URL"];
if (isProduction) required.push("GROQ_API_KEY", "VAPI_PUBLIC_KEY");

const missing = required.filter((key) => !env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const list = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  nodeEnv,
  isProduction,
  port: Number(env.PORT) || 3000,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN || "7d",
  groqApiKey: env.GROQ_API_KEY,
  llmModel: env.LLM_MODEL || "openai/gpt-oss-20b",
  vapiPublicKey: env.VAPI_PUBLIC_KEY,
  vapiModel: env.VAPI_MODEL || "gpt-3.5-turbo",
  vapiVoiceId: env.VAPI_VOICE_ID || "paula",
  corsOrigins: list(env.CORS_ORIGINS),
  trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) : isProduction ? 1 : false,
  tokens: {
    interviewCost: 10,
    signupGrant: 100,
  },
  interview: {
    durationMinutes: 10,
  },
};

export default config;
