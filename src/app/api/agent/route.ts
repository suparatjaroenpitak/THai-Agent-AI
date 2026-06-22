import { NextResponse } from "next/server";
import { z } from "zod";
import { runOpenCodexWorkflow } from "@/ai/langgraph";
import { routeModel } from "@/ai/router";
import { publishWorkerEvent } from "@/lib/redis";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().min(1),
  workspaceId: z.string().min(1),
  mode: z.enum(["auto", "cheapest", "fastest", "reasoning", "coding"]).default("auto")
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
    model: routing.primary.id,
    createdAt: new Date().toISOString()
  }).catch(() => undefined);

  const result = await runOpenCodexWorkflow(body);

  return NextResponse.json({
    message: `Queued ${routing.primary.label} with ${routing.fallbacks.length} fallbacks. ${result.summary}`,
    routing,
    steps: result.steps
  });
}
