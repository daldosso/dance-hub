import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({
    message: `Evento con id ${params.id} - da implementare`,
  });
}
