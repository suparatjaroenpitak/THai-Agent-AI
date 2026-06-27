import { z } from "zod";
import { runOllamaChatStream, type ChatMessage, type OllamaToolDefinition, type OllamaToolCall } from "@/ai/model-client";
import { runAgentLoop } from "@/ai/agent-loop";
import { env } from "@/env";

export const runtime = "nodejs";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant", "tool"]),
      content: z.string(),
    })
  ),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  seed: z.number().int().optional(),
  num_ctx: z.number().int().min(512).max(131072).optional(),
  repeat_penalty: z.number().optional(),
  stop: z.array(z.string()).optional(),
  tools: z
    .array(
      z.object({
        type: z.literal("function"),
        function: z.object({
          name: z.string(),
          description: z.string(),
          parameters: z.any(),
        }),
      })
    )
    .optional(),
  agent: z.boolean().optional().default(false),
  workspaceId: z.string().optional().default("current-workspace"),
});

/** POST /api/chat/stream — Streaming chat via Ollama */
export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid request body", details: error instanceof z.ZodError ? error.errors : undefined }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const model = body.model || env.OLLAMA_MODEL;
  const encoder = new TextEncoder();
  const abortController = new AbortController();

  request.signal.addEventListener("abort", () => abortController.abort());

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (body.agent) {
          // ── Agent mode: model can call tools, loop automatically ──
          const systemPrompt = body.messages.find((m) => m.role === "system")?.content;
          const userMessages = body.messages.filter((m) => m.role !== "system");

          await runAgentLoop(userMessages as ChatMessage[], {
            systemPrompt,
            model,
            workspaceId: body.workspaceId,
            signal: abortController.signal,
            options: {
              temperature: body.temperature ?? 0.1,
              num_ctx: body.num_ctx ?? 8192,
            },
            onEvent(event) {
              const eventData = {
                type: event.type,
                ...(event.type === "text" ? { content: event.content } : {}),
                ...(event.type === "tool_call" ? { tool: event.tool, arguments: event.arguments } : {}),
                ...(event.type === "tool_result" ? { tool: event.tool, success: event.success, output: event.output, durationMs: event.durationMs } : {}),
                ...(event.type === "done" ? { totalDurationMs: event.totalDurationMs, totalTokens: event.totalTokens } : {}),
                ...(event.type === "error" ? { error: event.error } : {}),
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
            },
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } else {
          // ── Simple streaming mode (no tool loop) ──
          await runOllamaChatStream({
            messages: body.messages as ChatMessage[],
            model,
            options: {
              temperature: body.temperature,
              top_p: body.top_p,
              seed: body.seed,
              num_ctx: body.num_ctx ?? 8192,
              repeat_penalty: body.repeat_penalty,
              stop: body.stop,
            },
            tools: body.tools as OllamaToolDefinition[] | undefined,
            signal: abortController.signal,

            onChunk(chunk) {
              const event = {
                type: "chunk" as const,
                content: chunk.message.content,
                done: chunk.done,
                model: chunk.model,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            },

            onToolCall(toolCall: OllamaToolCall) {
              const event = {
                type: "tool_call" as const,
                tool: toolCall.function.name,
                arguments: toolCall.function.arguments,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            },

            onDone(finalChunk) {
              const event = {
                type: "done" as const,
                model: finalChunk.model,
                totalDuration: finalChunk.total_duration,
                promptTokens: finalChunk.prompt_eval_count,
                completionTokens: finalChunk.eval_count,
                evalDuration: finalChunk.eval_duration,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            },
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "aborted" })}\n\n`));
          controller.close();
          return;
        }

        const message = error instanceof Error ? error.message : "Stream failed";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: message })}\n\n`
          )
        );
        controller.close();
      }
    },

    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Ollama-Model": model,
    },
  });
}
