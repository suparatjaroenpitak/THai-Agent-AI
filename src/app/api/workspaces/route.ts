import { NextResponse } from "next/server";
import { z } from "zod";
import { createDefaultSandboxSpec } from "@/workspace/cloud-sandbox";

export const runtime = "nodejs";

const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["local", "desktop_agent", "github", "cloud"]).default("cloud"),
  repository: z.string().optional()
});

export async function GET() {
  return NextResponse.json({
    workspaces: [
      {
        id: "demo-workspace",
        name: "OpenCodex Demo",
        kind: "cloud",
        branch: "main",
        sandbox: createDefaultSandboxSpec("demo-workspace")
      }
    ]
  });
}

export async function POST(request: Request) {
  const body = createWorkspaceSchema.parse(await request.json());
  const id = crypto.randomUUID();

  return NextResponse.json(
    {
      workspace: {
        id,
        ...body,
        sandbox: body.kind === "cloud" ? createDefaultSandboxSpec(id) : null
      }
    },
    { status: 201 }
  );
}
