import { NextResponse } from "next/server";
import { checkOllamaHealth, autoPullMissingModels, fetchOllamaModels } from "@/ai/providers";
import { env } from "@/env";

export const runtime = "nodejs";

export async function GET() {
  const health = await checkOllamaHealth();

  let pulled: string[] = [];
  if (!health.ok && env.AUTO_PULL_MODEL === "true") {
    pulled = await autoPullMissingModels();
    // Re-check after pulling
    const recheck = await checkOllamaHealth();
    Object.assign(health, recheck);
  }

  const ollamaConfig = {
    host: env.OLLAMA_HOST,
    defaultModel: env.OLLAMA_MODEL,
    reasoningModel: env.OLLAMA_REASONING_MODEL,
    embedModel: env.OLLAMA_EMBED_MODEL,
  };

  if (!health.ok) {
    const installCommands = health.missing.map((m) => `ollama pull ${m}`);
    return NextResponse.json(
      {
        ok: false,
        name: "OpenCodex",
        ollama: {
          ...ollamaConfig,
          status: health.error ? "unreachable" : "missing_models",
          error: health.error ?? `Missing models: ${health.missing.join(", ")}`,
          installedModels: health.models,
          missingModels: health.missing,
          installCommands,
          pulled,
        },
        hint: health.error
          ? "Ollama is not running. Start it with: ollama serve"
          : `Install missing models:\n${installCommands.join("\n")}`,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    name: "OpenCodex",
    ollama: {
      ...ollamaConfig,
      status: "connected",
      installedModels: health.models,
      pulled,
    },
    timestamp: new Date().toISOString(),
  });
}
