import { NextResponse } from "next/server";
import { z } from "zod";
import { runTerminalCommand } from "@/workspace/terminal";

export const runtime = "nodejs";

const terminalRequestSchema = z.object({
  workspaceId: z.string(),
  command: z.string(),
  cwd: z.string().optional()
});

export async function POST(request: Request) {
  const body = terminalRequestSchema.parse(await request.json());
  const result = await runTerminalCommand(body);
  return NextResponse.json(result);
}
