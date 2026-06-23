import { NextResponse } from "next/server";
import { fetchOllamaModels } from "@/ai/providers";
import { routeModel } from "@/ai/router";
import { env } from "@/env";

export const runtime = "nodejs";

export async function GET() {
  let models;
  try {
    models = await fetchOllamaModels();
  } catch {
    models = [];
  }

  const routing = routeModel({ mode: "auto" });

  return NextResponse.json({
    provider: "ollama",
    host: env.OLLAMA_HOST,
    models,
    routing,
    config: {
      defaultModel: env.OLLAMA_MODEL,
      reasoningModel: env.OLLAMA_REASONING_MODEL,
      embedModel: env.OLLAMA_EMBED_MODEL,
    },
  });
}
