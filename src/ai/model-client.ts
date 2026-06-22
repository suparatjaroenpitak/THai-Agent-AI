import { modelCatalog, type ModelProfile } from "@/ai/providers";
import { env } from "@/env";

export type RuntimeModelConfig = {
  model?: string;
  baseUrl?: string;
  apiKey?: string;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolveRuntimeModel(config: RuntimeModelConfig = {}) {
  const catalogMatch = modelCatalog.find((model) => model.id === config.model) ?? modelCatalog[0];

  return {
    profile: catalogMatch,
    model: config.model || catalogMatch.id,
    baseUrl: trimTrailingSlash(config.baseUrl || catalogMatch.baseUrl || env.DEFAULT_PROVIDER_BASE_URL),
    apiKey: config.apiKey || env.DEFAULT_PROVIDER_API_KEY
  };
}

function parseModelText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";

  const choices = "choices" in payload ? payload.choices : undefined;
  if (!Array.isArray(choices)) return "";

  const first = choices[0] as { message?: { content?: unknown }; text?: unknown } | undefined;
  const content = first?.message?.content ?? first?.text;
  return typeof content === "string" ? content.trim() : "";
}

export async function runOpenAICompatibleChat({
  messages,
  config,
  temperature = 0.2
}: {
  messages: ChatMessage[];
  config?: RuntimeModelConfig;
  temperature?: number;
}) {
  const runtimeModel = resolveRuntimeModel(config);
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (runtimeModel.apiKey) {
    headers.Authorization = `Bearer ${runtimeModel.apiKey}`;
  }

  const response = await fetch(`${runtimeModel.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: runtimeModel.model,
      messages,
      temperature
    })
  });

  const payload = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify(payload.error)
        : `Provider returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return {
    ...runtimeModel,
    content: parseModelText(payload) || "The model returned an empty response."
  };
}

export function describeModel(profile: ModelProfile) {
  return `${profile.label} (${profile.id})`;
}
