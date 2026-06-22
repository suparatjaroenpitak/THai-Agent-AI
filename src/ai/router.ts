import { modelCatalog, type ModelProfile } from "@/ai/providers";

export type RoutingMode = "auto" | "cheapest" | "fastest" | "reasoning" | "coding";

export type RoutingDecision = {
  primary: ModelProfile;
  fallbacks: ModelProfile[];
  loadBalancePool: ModelProfile[];
  estimatedCostUsd: number;
  reason: string;
};

export function estimateCostUsd(model: ModelProfile, inputTokens: number, outputTokens: number) {
  return (inputTokens / 1_000_000) * model.inputCostPerMillion + (outputTokens / 1_000_000) * model.outputCostPerMillion;
}

export function routeModel({
  mode,
  inputTokens,
  outputTokens,
  requiredTags = []
}: {
  mode: RoutingMode;
  inputTokens: number;
  outputTokens: number;
  requiredTags?: ModelProfile["tags"];
}): RoutingDecision {
  const candidates = modelCatalog
    .filter((model, index, all) => all.findIndex((entry) => entry.id === model.id && entry.provider === model.provider) === index)
    .filter((model) => requiredTags.every((tag) => model.tags.includes(tag)));

  const pool = candidates.length > 0 ? candidates : modelCatalog;
  const scored = pool
    .map((model) => ({
      model,
      cost: estimateCostUsd(model, inputTokens, outputTokens)
    }))
    .sort((a, b) => {
      if (mode === "fastest") return Number(b.model.tags.includes("fast")) - Number(a.model.tags.includes("fast")) || a.cost - b.cost;
      if (mode === "reasoning") return Number(b.model.tags.includes("reasoning")) - Number(a.model.tags.includes("reasoning")) || a.cost - b.cost;
      if (mode === "coding") return Number(b.model.tags.includes("coding")) - Number(a.model.tags.includes("coding")) || a.cost - b.cost;
      return a.cost - b.cost;
    });

  const primary = scored[0]?.model ?? modelCatalog[0];
  const fallbacks = scored.slice(1, 4).map((entry) => entry.model);
  const loadBalancePool = scored.slice(0, 4).map((entry) => entry.model);

  return {
    primary,
    fallbacks,
    loadBalancePool,
    estimatedCostUsd: estimateCostUsd(primary, inputTokens, outputTokens),
    reason:
      mode === "auto" || mode === "cheapest"
        ? "Selected the lowest estimated cost model with compatible capabilities."
        : `Selected for ${mode} workload with automatic fallback.`
  };
}
