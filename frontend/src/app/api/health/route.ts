import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Dance-Hub API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
