import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-secret",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      GROQ_API_KEY: "",
    },
  },
});
