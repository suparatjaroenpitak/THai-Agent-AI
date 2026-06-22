import { describe, expect, it } from "vitest";
import { estimateCostUsd, routeModel } from "@/ai/router";
import { modelCatalog } from "@/ai/providers";

describe("model router", () => {
  it("selects a cheap coding model with fallbacks", () => {
    const decision = routeModel({
      mode: "auto",
      inputTokens: 10_000,
      outputTokens: 2_000,
      requiredTags: ["coding"]
    });

    expect(decision.primary.tags).toContain("coding");
    expect(decision.fallbacks.length).toBeGreaterThan(0);
    expect(decision.estimatedCostUsd).toBeGreaterThanOrEqual(0);
  });

  it("estimates token cost", () => {
    const model = modelCatalog[0];
    expect(estimateCostUsd(model, 1_000_000, 1_000_000)).toBeCloseTo(
      model.inputCostPerMillion + model.outputCostPerMillion
    );
  });
});
