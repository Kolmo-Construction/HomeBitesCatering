import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const OPENROUTER_MODEL = "deepseek/deepseek-chat-v3-0324:free";
const DEEPSEEK_NATIVE_MODEL = "deepseek-chat";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

const APP_REFERRER = "https://homebites.design";
const APP_TITLE = "Home Bites Catering CMS";

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

const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? "";
const deepseekNativeApiKey = readDeepseekKeyFile();

const openRouterClient: OpenAI | null = openRouterApiKey
  ? new OpenAI({
      apiKey: openRouterApiKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": APP_REFERRER,
        "X-Title": APP_TITLE,
      },
    })
  : null;

const deepseekNativeClient: OpenAI | null = deepseekNativeApiKey
  ? new OpenAI({
      apiKey: deepseekNativeApiKey,
      baseURL: DEEPSEEK_BASE_URL,
    })
  : null;

export type LlmProvider = "openrouter-deepseek-free" | "deepseek-native";

interface ProviderAttempt {
  label: LlmProvider;
  client: OpenAI;
  model: string;
}

const providerAttempts: ProviderAttempt[] = [];
if (openRouterClient) {
  providerAttempts.push({
    label: "openrouter-deepseek-free",
    client: openRouterClient,
    model: OPENROUTER_MODEL,
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
      "No LLM provider configured. Set OPENROUTER_API_KEY or create a .Deepseek file at the repo root containing your DeepSeek API key.",
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
