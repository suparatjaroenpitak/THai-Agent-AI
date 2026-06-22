import { NextResponse } from "next/server";
import { modelCatalog } from "@/ai/providers";
import { mcpCatalog } from "@/mcp/catalog";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "OpenCodex",
    providers: modelCatalog.length,
    mcpConnectors: mcpCatalog.length,
    timestamp: new Date().toISOString()
  });
}
