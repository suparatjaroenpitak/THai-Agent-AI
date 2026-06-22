import { NextResponse } from "next/server";
import { z } from "zod";
import { runOpenCodexWorkflow } from "@/ai/langgraph";
import { routeModel } from "@/ai/router";
import { publishWorkerEvent } from "@/lib/redis";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().min(1),
  workspaceId: z.string().min(1),
  activePath: z.string().optional(),
  mode: z.enum(["auto", "cheapest", "fastest", "reasoning", "coding"]).default("auto"),
  model: z
    .object({
      model: z.string().optional(),
      baseUrl: z.string().url().optional(),
      apiKey: z.string().optional()
    })
    .optional()
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const routing = routeModel({
    mode: body.mode,
    inputTokens: Math.max(1000, body.prompt.length * 2),
    outputTokens: 2500,
    requiredTags: ["coding"]
  });

  await publishWorkerEvent("opencodex:tasks", {
    type: "agent.workflow.queued",
    workspaceId: body.workspaceId,
    prompt: body.prompt,
    model: body.model?.model ?? routing.primary.id,
    createdAt: new Date().toISOString()
  }).catch(() => undefined);

  const result = await runOpenCodexWorkflow(body);

  return NextResponse.json({
    message: result.summary || `Completed workflow with ${routing.primary.label}.`,
    routing,
    steps: result.steps
  });
}
