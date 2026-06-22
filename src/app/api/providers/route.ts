import { NextResponse } from "next/server";
import { modelCatalog } from "@/ai/providers";
import { routeModel } from "@/ai/router";

export const runtime = "nodejs";

export async function GET() {
  const decision = routeModel({
    mode: "auto",
    inputTokens: 8000,
    outputTokens: 2500,
    requiredTags: ["coding"]
  });

  return NextResponse.json({
    providers: modelCatalog,
    routing: decision
  });
}
