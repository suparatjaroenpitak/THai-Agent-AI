import { NextResponse } from "next/server";
import { z } from "zod";
import { runGit } from "@/workspace/git";

export const runtime = "nodejs";

const gitRequestSchema = z.object({
  workspaceId: z.string().default("current-workspace"),
  cwd: z.string().optional(),
  args: z.array(z.string()).min(1)
});

export async function POST(request: Request) {
  const body = gitRequestSchema.parse(await request.json());
  const result = await runGit(body.args, body.workspaceId, body.cwd);
  return NextResponse.json(result);
}
