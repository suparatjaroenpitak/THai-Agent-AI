import { NextResponse } from "next/server";
import { z } from "zod";
import { chunkDocument, rankChunksByKeyword } from "@/ai/rag";

export const runtime = "nodejs";

const ragRequestSchema = z.object({
  workspaceId: z.string(),
  query: z.string(),
  documents: z.array(
    z.object({
      id: z.string(),
      path: z.string(),
      title: z.string(),
      content: z.string()
    })
  )
});

export async function POST(request: Request) {
  const body = ragRequestSchema.parse(await request.json());
  const chunks = body.documents.flatMap((document) =>
    chunkDocument({
      ...document,
      workspaceId: body.workspaceId,
      contentHash: String(document.content.length)
    })
  );

  return NextResponse.json({
    context: rankChunksByKeyword(body.query, chunks).slice(0, 8)
  });
}
