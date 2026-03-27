import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(auth.user.id) },
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        dance_styles: true,
        skill_level: true,
        is_teacher: true,
        is_organizer: true,
        city: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    return NextResponse.json({
      id: Number(user.id),
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      dance_styles: user.dance_styles,
      skill_level: user.skill_level,
      is_teacher: user.is_teacher,
      is_organizer: user.is_organizer,
      city: user.city,
      created_at: user.created_at,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Errore nel recupero utente" },
      { status: 500 },
    );
  }
}
