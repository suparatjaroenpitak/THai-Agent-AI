import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace, listWorkspaceTree, readWorkspaceFile, saveWorkspaceFile } from "@/workspace/server-project";

export const runtime = "nodejs";

const saveFileSchema = z.object({
  workspaceId: z.string().default("current-workspace"),
  path: z.string().min(1),
  content: z.string()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") ?? "current-workspace";
  const targetPath = searchParams.get("path");

  if (targetPath) {
    return NextResponse.json({
      workspace: await getWorkspace(workspaceId),
      file: await readWorkspaceFile(targetPath, workspaceId)
    });
  }

  return NextResponse.json({
    workspace: await getWorkspace(workspaceId),
    tree: await listWorkspaceTree(workspaceId)
  });
}

export async function PUT(request: Request) {
  const body = saveFileSchema.parse(await request.json());

  return NextResponse.json({
    workspace: await getWorkspace(body.workspaceId),
    file: await saveWorkspaceFile(body.path, body.content, body.workspaceId)
  });
}
