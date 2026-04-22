import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const GEMINI_MODEL = "gemini-2.0-flash";
const DEEPSEEK_NATIVE_MODEL = "deepseek-chat";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

function readDeepseekKeyFile(): string | null {
  try {
    const filePath = resolve(process.cwd(), ".Deepseek");
    const raw = readFileSync(filePath, "utf-8").trim();
    if (!raw) return null;
    const envMatch = raw.match(/^(?:DEEPSEEK_API_KEY|DEEPSEEK_KEY)\s*=\s*(.+)$/m);
    if (envMatch) {
      return envMatch[1].trim().replace(/^["']|["']$/g, "");
    }
    return raw;
  } catch {
    return null;
  }
}

const geminiApiKey =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_AI_API_KEY?.trim() ||
  "";
const deepseekNativeApiKey =
  process.env.DEEPSEEK_API_KEY?.trim() || readDeepseekKeyFile();

const geminiClient: OpenAI | null = geminiApiKey
  ? new OpenAI({
      apiKey: geminiApiKey,
      baseURL: GEMINI_BASE_URL,
    })
  : null;

const deepseekNativeClient: OpenAI | null = deepseekNativeApiKey
  ? new OpenAI({
      apiKey: deepseekNativeApiKey,
      baseURL: DEEPSEEK_BASE_URL,
    })
  : null;

export type LlmProvider = "gemini-2.0-flash" | "deepseek-native";

interface ProviderAttempt {
  label: LlmProvider;
  client: OpenAI;
  model: string;
}

const providerAttempts: ProviderAttempt[] = [];
if (geminiClient) {
  providerAttempts.push({
    label: "gemini-2.0-flash",
    client: geminiClient,
    model: GEMINI_MODEL,
  });
}
if (deepseekNativeClient) {
  providerAttempts.push({
    label: "deepseek-native",
    client: deepseekNativeClient,
    model: DEEPSEEK_NATIVE_MODEL,
  });
}

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface LlmChatOptions {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export interface LlmChatResult {
  content: string;
  provider: LlmProvider;
}

export class LlmUnavailableError extends Error {
  constructor() {
    super(
      "No LLM provider configured. Set GEMINI_API_KEY (primary) and/or DEEPSEEK_API_KEY (fallback, or a .Deepseek file at the repo root).",
    );
    this.name = "LlmUnavailableError";
  }
}

export function hasLlmProvider(): boolean {
  return providerAttempts.length > 0;
}

export function configuredProviders(): LlmProvider[] {
  return providerAttempts.map((p) => p.label);
}

export async function createChatCompletion(options: LlmChatOptions): Promise<LlmChatResult> {
  if (providerAttempts.length === 0) {
    throw new LlmUnavailableError();
  }

  const { messages, temperature = 0.3, maxTokens, json = false } = options;

  let lastError: unknown;
  for (const attempt of providerAttempts) {
    try {
      const response = await attempt.client.chat.completions.create({
        model: attempt.model,
        messages,
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        ...(json ? { response_format: { type: "json_object" } } : {}),
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        return { content, provider: attempt.label };
      }

      lastError = new Error(`Empty response from ${attempt.label}`);
      console.warn(`[llmClient] ${attempt.label} returned empty content — trying next provider`);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[llmClient] ${attempt.label} failed: ${message}`);
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`All LLM providers failed. Last error: ${reason}`);
}
