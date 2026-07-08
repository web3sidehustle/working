import dotenv from "dotenv";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

dotenv.config();

const normalizeApiBaseUrl = (rawUrl?: string) => {
  const defaultUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
  const candidate = (rawUrl || "").trim() || defaultUrl;
  const normalized = candidate
    .replace(/^http:\/\/integrate\.api\.nvidia\.com/, "https://integrate.api.nvidia.com")
    .trim();

  const withoutChatSuffix = normalized.replace(/\/chat\/completions\/?$/, "");
  const withApiSuffix = withoutChatSuffix.endsWith("/v1")
    ? withoutChatSuffix
    : `${withoutChatSuffix.replace(/\/$/, "")}/v1`;

  return withApiSuffix;
};

export const availableModels = [
  "minimaxai/minimax-m3",
  "qwen/qwen3.5-397b-a17b",
  "moonshotai/kimi-k2.6",
  "z-ai/glm-5.2",
  "deepseek-ai/deepseek-v4-flash",
] as const;

export const defaultModelName =
  process.env.OPENROUTER_MODEL?.trim() || "deepseek-ai/deepseek-v4-flash";

const apiKey = process.env.NVIDIA_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim();
const baseURL = normalizeApiBaseUrl(process.env.OPENROUTER_URL);

if (!apiKey) {
  console.warn("Missing NVIDIA_API_KEY or OPENROUTER_API_KEY. The bot will still start, but AI responses may be limited.");
}

console.log(`OpenRouter-compatible model configured: ${defaultModelName}`);
console.log(`OpenRouter-compatible base URL: ${baseURL}`);

export const openrouterLLM = createOpenAICompatible({
  apiKey,
  baseURL,
  name: "nvidia-openrouter-compatible",
});
