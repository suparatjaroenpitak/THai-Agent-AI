import { env } from "@/env";

// ── Types ───────────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
};

export type OllamaToolCall = {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
};

export type OllamaToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
  };
};

export type OllamaChatOptions = {
  temperature?: number;
  top_p?: number;
  seed?: number;
  num_ctx?: number;
  repeat_penalty?: number;
  stop?: string[];
};

export type OllamaChatRequest = {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  options?: OllamaChatOptions;
  tools?: OllamaToolDefinition[];
};

export type OllamaChatResponse = {
  model: string;
  created_at: string;
  message: {
    role: "assistant";
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
};

export type OllamaStreamChunk = {
  model: string;
  created_at: string;
  message: {
    role: "assistant";
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
};

export type OllamaEmbedResponse = {
  model: string;
  embeddings: number[][];
  total_duration?: number;
};

export type RuntimeModelConfig = {
  model?: string;
  reasoningModel?: string;
  codingModel?: string;
  embedModel?: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function ollamaHost(): string {
  return env.OLLAMA_HOST.replace(/\/+$/, "");
}

export function resolveModel(config?: RuntimeModelConfig, taskType?: "general" | "reasoning" | "coding" | "embedding"): string {
  if (taskType === "embedding") return config?.embedModel || env.OLLAMA_EMBED_MODEL;
  if (taskType === "reasoning") return config?.reasoningModel || env.OLLAMA_REASONING_MODEL;
  if (taskType === "coding") return config?.codingModel || config?.model || env.OLLAMA_MODEL;
  return config?.model || env.OLLAMA_MODEL;
}

// ── Chat (non-streaming) ────────────────────────────────────────────────────

export async function runOllamaChat({
  messages,
  model,
  options,
  tools,
  signal,
}: {
  messages: ChatMessage[];
  model?: string;
  options?: OllamaChatOptions;
  tools?: OllamaToolDefinition[];
  signal?: AbortSignal;
}): Promise<OllamaChatResponse> {
  const body: OllamaChatRequest = {
    model: model || env.OLLAMA_MODEL,
    messages,
    stream: false,
    options: {
      temperature: options?.temperature ?? 0.2,
      num_ctx: options?.num_ctx ?? 8192,
      ...options,
    },
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(`${ollamaHost()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ollama chat failed (HTTP ${response.status}): ${errorText}`);
  }

  return (await response.json()) as OllamaChatResponse;
}

// ── Chat (streaming) ────────────────────────────────────────────────────────

export async function runOllamaChatStream({
  messages,
  model,
  options,
  tools,
  signal,
  onChunk,
  onToolCall,
  onDone,
}: {
  messages: ChatMessage[];
  model?: string;
  options?: OllamaChatOptions;
  tools?: OllamaToolDefinition[];
  signal?: AbortSignal;
  onChunk?: (chunk: OllamaStreamChunk) => void;
  onToolCall?: (toolCall: OllamaToolCall) => void;
  onDone?: (finalChunk: OllamaStreamChunk) => void;
}): Promise<string> {
  const body: OllamaChatRequest = {
    model: model || env.OLLAMA_MODEL,
    messages,
    stream: true,
    options: {
      temperature: options?.temperature ?? 0.2,
      num_ctx: options?.num_ctx ?? 8192,
      ...options,
    },
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(`${ollamaHost()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ollama stream failed (HTTP ${response.status}): ${errorText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const chunk = JSON.parse(line) as OllamaStreamChunk;
          accumulated += chunk.message.content;

          if (chunk.message.tool_calls) {
            for (const tc of chunk.message.tool_calls) {
              onToolCall?.(tc);
            }
          }

          onChunk?.(chunk);

          if (chunk.done) {
            onDone?.(chunk);
          }
        } catch {
          // skip malformed NDJSON lines
        }
      }
    }

    // process remaining buffer
    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer) as OllamaStreamChunk;
        accumulated += chunk.message.content;
        onChunk?.(chunk);
        if (chunk.done) onDone?.(chunk);
      } catch {
        // skip
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

// ── Embedding ───────────────────────────────────────────────────────────────

export async function runOllamaEmbed({
  input,
  model,
  signal,
}: {
  input: string | string[];
  model?: string;
  signal?: AbortSignal;
}): Promise<number[][]> {
  const response = await fetch(`${ollamaHost()}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || env.OLLAMA_EMBED_MODEL,
      input: Array.isArray(input) ? input : [input],
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ollama embed failed (HTTP ${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as OllamaEmbedResponse;
  return data.embeddings;
}

// ── Convenience ─────────────────────────────────────────────────────────────

export async function askOllama(prompt: string, systemPrompt?: string, model?: string): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const result = await runOllamaChat({ messages, model });
  return result.message.content;
}
