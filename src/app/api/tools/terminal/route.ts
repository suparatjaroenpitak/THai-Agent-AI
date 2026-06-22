import { NextResponse } from "next/server";
import { z } from "zod";
import { publishWorkerEvent } from "@/lib/redis";

export const runtime = "nodejs";

const terminalRequestSchema = z.object({
  workspaceId: z.string(),
  command: z.string(),
  cwd: z.string().optional()
});

export async function POST(request: Request) {
  const body = terminalRequestSchema.parse(await request.json());
  const id = crypto.randomUUID();

  await publishWorkerEvent("opencodex:terminal", {
    id,
    type: "terminal.command",
    ...body,
    createdAt: new Date().toISOString()
  }).catch(() => undefined);

  return NextResponse.json({
    id,
    status: "queued"
  });
}
