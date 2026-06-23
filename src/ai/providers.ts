import { env } from "@/env";

// ── Types ───────────────────────────────────────────────────────────────────

export type OllamaModelDetail = {
  parent_model: string;
  format: string;
  family: string;
  families: string[] | null;
  parameter_size: string;
  quantization_level: string;
};

export type OllamaModel = {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetail;
};

export type OllamaTagsResponse = {
  models: OllamaModel[];
};

export type ModelProfile = {
  id: string;
  label: string;
  provider: "ollama";
  baseUrl: string;
  contextWindow: number;
  parameterSize: string;
  family: string;
  quantization: string;
  sizeBytes: number;
  tags: Array<"coding" | "reasoning" | "fast" | "embedding" | "tool-use" | "general">;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function ollamaHost(): string {
  return env.OLLAMA_HOST.replace(/\/+$/, "");
}

function inferTags(modelName: string): ModelProfile["tags"] {
  const lower = modelName.toLowerCase();
  const tags: ModelProfile["tags"] = [];

  if (lower.includes("coder") || lower.includes("codellama") || lower.includes("starcoder")) {
    tags.push("coding");
  }
  if (lower.includes("r1") || lower.includes("deepseek-r1") || lower.includes("reasoning")) {
    tags.push("reasoning");
  }
  if (lower.includes("embed") || lower.includes("nomic")) {
    tags.push("embedding");
  }
  if (lower.includes("phi") || lower.includes("gemma") || lower.includes("llama3") || lower.includes("mistral")) {
    tags.push("fast");
  }
  if (tags.length === 0) {
    tags.push("general");
  }
  return tags;
}

function inferContextWindow(modelName: string, paramSize: string): number {
  const lower = modelName.toLowerCase();
  if (lower.includes("qwen") || lower.includes("deepseek")) return 32768;
  if (lower.includes("llama3")) return 131072;
  if (lower.includes("mistral")) return 32768;
  if (lower.includes("gemma")) return 8192;
  if (lower.includes("phi")) return 16384;

  const sizeNum = parseFloat(paramSize);
  if (sizeNum >= 30) return 32768;
  if (sizeNum >= 7) return 8192;
  return 4096;
}

function modelLabel(name: string): string {
  const base = name.split(":")[0];
  return base
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ── API Functions ───────────────────────────────────────────────────────────

/** Fetch installed models from Ollama */
export async function fetchOllamaModels(): Promise<ModelProfile[]> {
  const response = await fetch(`${ollamaHost()}/api/tags`, {
    method: "GET",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as OllamaTagsResponse;

  return (data.models ?? []).map((model) => ({
    id: model.name,
    label: modelLabel(model.name),
    provider: "ollama" as const,
    baseUrl: ollamaHost(),
    contextWindow: inferContextWindow(model.name, model.details.parameter_size),
    parameterSize: model.details.parameter_size,
    family: model.details.family,
    quantization: model.details.quantization_level,
    sizeBytes: model.size,
    tags: inferTags(model.name),
  }));
}

/** Check if Ollama is reachable */
export async function checkOllamaHealth(): Promise<{
  ok: boolean;
  models: string[];
  missing: string[];
  error?: string;
}> {
  const requiredModels = [env.OLLAMA_MODEL, env.OLLAMA_REASONING_MODEL, env.OLLAMA_EMBED_MODEL].filter(Boolean);

  try {
    const models = await fetchOllamaModels();
    const installedNames = new Set(models.map((m) => m.id.split(":")[0]));

    const missing = requiredModels.filter((name) => {
      const base = name.split(":")[0];
      return !installedNames.has(base) && !installedNames.has(name);
    });

    return {
      ok: missing.length === 0,
      models: models.map((m) => m.id),
      missing,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ollama unreachable";
    return {
      ok: false,
      models: [],
      missing: requiredModels,
      error: message,
    };
  }
}

/** Pull a model from Ollama registry */
export async function pullOllamaModel(modelName: string): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${ollamaHost()}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: modelName, stream: true }),
  });

  if (!response.ok) {
    throw new Error(`Failed to pull ${modelName}: HTTP ${response.status}`);
  }

  return response.body!;
}

/** Auto-pull missing models if AUTO_PULL_MODEL is enabled */
export async function autoPullMissingModels(): Promise<string[]> {
  if (env.AUTO_PULL_MODEL !== "true") return [];

  const health = await checkOllamaHealth();
  const pulled: string[] = [];

  for (const model of health.missing) {
    console.log(`[Ollama] Auto-pulling model: ${model}`);
    try {
      const stream = await pullOllamaModel(model);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (chunk.value) {
          const text = decoder.decode(chunk.value, { stream: true });
          for (const line of text.split("\n").filter(Boolean)) {
            try {
              const progress = JSON.parse(line) as { status?: string };
              if (progress.status) {
                process.stdout.write(`\r[Ollama] ${model}: ${progress.status}    `);
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
      console.log(`\n[Ollama] Pulled ${model} successfully`);
      pulled.push(model);
    } catch (error) {
      console.error(`[Ollama] Failed to pull ${model}:`, error instanceof Error ? error.message : error);
    }
  }

  return pulled;
}
