import Groq from "groq-sdk";
import config from "../config/config.js";

const client = config.groqApiKey
  ? new Groq({ apiKey: config.groqApiKey, timeout: 30_000, maxRetries: 1 })
  : null;

export const llmAvailable = Boolean(client);

/** Single entry point for LLM calls (shared client, model and timeout). */
export async function complete({ prompt, temperature = 0.4, maxTokens = 3000, json = false }) {
  if (!client) throw new Error("LLM is not configured (GROQ_API_KEY missing)");

  const params = {
    model: config.llmModel,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens: maxTokens,
    ...(json && { response_format: { type: "json_object" } }),
  };

  let completion;
  try {
    completion = await client.chat.completions.create(params);
  } catch (error) {
    // Some models reject JSON mode; retry once as plain text (the caller parses defensively).
    if (json && error?.status === 400) {
      delete params.response_format;
      completion = await client.chat.completions.create(params);
    } else {
      throw error;
    }
  }

  return completion.choices[0]?.message?.content?.trim() || "";
}
