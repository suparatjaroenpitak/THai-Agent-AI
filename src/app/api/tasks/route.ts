import { NextResponse } from "next/server";
import { z } from "zod";
import { publishWorkerEvent } from "@/lib/redis";

export const runtime = "nodejs";

const taskSchema = z.object({
  workspaceId: z.string(),
  title: z.string(),
  objective: z.string()
});

export async function GET() {
  return NextResponse.json({
    tasks: [
      { id: "task-plan", title: "Plan", status: "completed", progress: 100 },
      { id: "task-code", title: "Code", status: "running", progress: 42 },
      { id: "task-test", title: "Test", status: "queued", progress: 0 }
    ]
  });
}

export async function POST(request: Request) {
  const body = taskSchema.parse(await request.json());
  const task = {
    id: crypto.randomUUID(),
    ...body,
    status: "queued",
    progress: 0,
    createdAt: new Date().toISOString()
  };

  await publishWorkerEvent("opencodex:tasks", {
    type: "task.created",
    task
  }).catch(() => undefined);

  return NextResponse.json({ task }, { status: 201 });
}
