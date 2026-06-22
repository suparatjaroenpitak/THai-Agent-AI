import { NextResponse } from "next/server";
import { z } from "zod";
import { indexCodeFile } from "@/ai/code-index";
import { chunkDocument, rankChunksByKeyword } from "@/ai/rag";

export const runtime = "nodejs";

const indexRequestSchema = z.object({
  workspaceId: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string()
    })
  )
});

export async function POST(request: Request) {
  const body = indexRequestSchema.parse(await request.json());
  const indexed = body.files.map((file) => indexCodeFile(file.path, file.content));
  const chunks = body.files.flatMap((file) =>
    chunkDocument({
      id: `${body.workspaceId}:${file.path}`,
      workspaceId: body.workspaceId,
      path: file.path,
      title: file.path,
      content: file.content,
      contentHash: String(file.content.length)
    })
  );

  return NextResponse.json({
    workspaceId: body.workspaceId,
    files: indexed,
    sampleContext: rankChunksByKeyword("architecture agent workflow", chunks).slice(0, 5)
  });
}
