import { NextResponse } from "next/server";
import { mcpCatalog } from "@/mcp/catalog";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    connectors: mcpCatalog
  });
}
