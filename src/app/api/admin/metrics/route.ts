import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    users: 1,
    apiUsageUsd: 0,
    providers: 17,
    workers: {
      queue: "online",
      websocket: "online",
      sandbox: "pending"
    },
    logs: {
      errors: 0,
      warnings: 0
    }
  });
}
