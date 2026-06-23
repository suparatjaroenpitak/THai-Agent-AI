import { env } from "@/env";
import { fetchOllamaModels, type ModelProfile } from "@/ai/providers";
import { resolveModel, type RuntimeModelConfig } from "@/ai/model-client";

// ── Types ───────────────────────────────────────────────────────────────────

export type RoutingMode = "auto" | "reasoning" | "coding" | "fast" | "embedding";

export type RoutingDecision = {
  primary: string;
  fallbacks: string[];
  mode: RoutingMode;
  reason: string;
};

// ── Router ──────────────────────────────────────────────────────────────────

/**
 * Route to the appropriate Ollama model based on task type.
 * Unlike cloud routing (cost-based), Ollama routing is task-type-based
 * since all models run locally at zero cost.
 */
export function routeModel({
  mode,
  config,
}: {
  mode: RoutingMode;
  config?: RuntimeModelConfig;
}): RoutingDecision {
  const defaultModel = env.OLLAMA_MODEL;
  const reasoningModel = env.OLLAMA_REASONING_MODEL;

  if (mode === "reasoning") {
    return {
      primary: resolveModel(config, "reasoning"),
      fallbacks: [defaultModel],
      mode,
      reason: `Reasoning task routed to ${reasoningModel} with fallback to ${defaultModel}.`,
    };
  }

  if (mode === "coding") {
    return {
      primary: resolveModel(config, "coding"),
      fallbacks: [reasoningModel, defaultModel].filter((m) => m !== resolveModel(config, "coding")),
      mode,
      reason: `Coding task routed to ${resolveModel(config, "coding")}.`,
    };
  }

  if (mode === "embedding") {
    return {
      primary: resolveModel(config, "embedding"),
      fallbacks: [],
      mode,
      reason: `Embedding task using ${resolveModel(config, "embedding")}.`,
    };
  }

  if (mode === "fast") {
    return {
      primary: defaultModel,
      fallbacks: [reasoningModel],
      mode,
      reason: `Fast task using default model ${defaultModel}.`,
    };
  }

  // auto mode: use default coding model
  return {
    primary: resolveModel(config, "coding"),
    fallbacks: [reasoningModel, defaultModel].filter((m, i, arr) => arr.indexOf(m) === i),
    mode: "auto",
    reason: `Auto-routed to ${resolveModel(config, "coding")}.`,
  };
}

/**
 * Execute a chat request with automatic fallback.
 * If the primary model fails, tries fallback models in order.
 */
export async function routeWithFallback<T>(
  decision: RoutingDecision,
  executor: (model: string) => Promise<T>
): Promise<{ result: T; usedModel: string; attempts: number }> {
  const models = [decision.primary, ...decision.fallbacks];
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < models.length; attempt++) {
    const model = models[attempt];
    try {
      const result = await executor(model);
      return { result, usedModel: model, attempts: attempt + 1 };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Router] Model ${model} failed (attempt ${attempt + 1}/${models.length}): ${lastError.message}`);
    }
  }

  throw lastError ?? new Error("All models failed");
}

/**
 * Get the full routing info for display purposes.
 */
export async function getRoutingInfo(): Promise<{
  defaultModel: string;
  reasoningModel: string;
  embedModel: string;
  availableModels: ModelProfile[];
}> {
  let availableModels: ModelProfile[] = [];
  try {
    availableModels = await fetchOllamaModels();
  } catch {
    // Ollama may be offline
  }

  return {
    defaultModel: env.OLLAMA_MODEL,
    reasoningModel: env.OLLAMA_REASONING_MODEL,
    embedModel: env.OLLAMA_EMBED_MODEL,
    availableModels,
  };
}
