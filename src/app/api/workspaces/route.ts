import { NextResponse } from "next/server";
import { z } from "zod";
import { bindLocalWorkspace, cloneGithubWorkspace, listWorkspaces } from "@/workspace/server-project";

export const runtime = "nodejs";

const createWorkspaceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("local"),
    name: z.string().optional(),
    path: z.string().min(1)
  }),
  z.object({
    kind: z.literal("github"),
    name: z.string().optional(),
    repository: z.string().min(1)
  })
]);

export async function GET() {
  return NextResponse.json({
    workspaces: await listWorkspaces()
  });
}

export async function POST(request: Request) {
  const body = createWorkspaceSchema.parse(await request.json());
  const workspace =
    body.kind === "local"
      ? await bindLocalWorkspace({ name: body.name, rootPath: body.path })
      : await cloneGithubWorkspace({ name: body.name, repository: body.repository });

  return NextResponse.json({ workspace }, { status: 201 });
}
