import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).optional(),
  fullName: z.string().optional(),
  birthDate: z.string().datetime().optional(),
  gender: z.string().optional(),
  city: z.string().optional(),
  danceStyles: z.array(z.string()).optional(),
  skillLevel: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const validated = registerSchema.parse(payload);

    const existingUser = await prisma.users.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email gia registrata" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await prisma.users.create({
      data: {
        email: validated.email,
        password_hash: passwordHash,
        username: validated.username,
        full_name: validated.fullName,
        birth_date: validated.birthDate ? new Date(validated.birthDate) : null,
        gender: validated.gender,
        city: validated.city,
        dance_styles: validated.danceStyles || [],
        skill_level: validated.skillLevel,
        is_active: true,
      },
    });

    return NextResponse.json(
      {
        message: "Utente registrato",
        user: {
          id: Number(user.id),
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore durante la registrazione";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
