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
  mode: z.enum(["auto", "reasoning", "coding", "fast", "embedding"]).default("auto"),
  model: z
    .object({
      model: z.string().optional(),
      reasoningModel: z.string().optional(),
      codingModel: z.string().optional(),
      embedModel: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const routing = routeModel({
    mode: body.mode,
    config: body.model,
  });

  await publishWorkerEvent("opencodex:tasks", {
    type: "agent.workflow.queued",
    workspaceId: body.workspaceId,
    prompt: body.prompt,
    model: routing.primary,
    createdAt: new Date().toISOString(),
  }).catch(() => undefined);

  const result = await runOpenCodexWorkflow({
    prompt: body.prompt,
    workspaceId: body.workspaceId,
    mode: body.mode,
    activePath: body.activePath,
    model: body.model,
  });

  return NextResponse.json({
    message: result.summary || `Completed workflow with ${routing.primary}.`,
    routing,
    steps: result.steps,
  });
}
