import { NextResponse } from "next/server";
import { fetchOllamaModels, pullOllamaModel } from "@/ai/providers";
import { env } from "@/env";

export const runtime = "nodejs";

/** GET /api/ollama/models — List installed Ollama models */
export async function GET() {
  try {
    const models = await fetchOllamaModels();
    return NextResponse.json({
      models,
      config: {
        host: env.OLLAMA_HOST,
        defaultModel: env.OLLAMA_MODEL,
        reasoningModel: env.OLLAMA_REASONING_MODEL,
        embedModel: env.OLLAMA_EMBED_MODEL,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch models";
    return NextResponse.json(
      {
        models: [],
        error: message,
        hint: "Make sure Ollama is running: ollama serve",
      },
      { status: 503 }
    );
  }
}

/** POST /api/ollama/models — Pull a new model */
export async function POST(request: Request) {
  const body = (await request.json()) as { model?: string };
  const modelName = body.model?.trim();

  if (!modelName) {
    return NextResponse.json({ error: "model field is required" }, { status: 400 });
  }

  try {
    const stream = await pullOllamaModel(modelName);
    const encoder = new TextEncoder();

    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            for (const line of text.split("\n").filter(Boolean)) {
              controller.enqueue(encoder.encode(`data: ${line}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(transformedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to pull model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
