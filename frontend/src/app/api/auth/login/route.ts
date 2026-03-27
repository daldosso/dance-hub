import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const JWT_SECRET = process.env.JWT_SECRET ?? "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definito nelle variabili d'ambiente");
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { email, password } = loginSchema.parse(payload);

    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: "Credenziali non valide" },
        { status: 401 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Credenziali non valide" },
        { status: 401 },
      );
    }

    const token = jwt.sign(
      {
        id: Number(user.id),
        email: user.email,
        role: user.is_organizer ? "organizer" : "user",
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return NextResponse.json({
      token,
      user: {
        id: Number(user.id),
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        isTeacher: user.is_teacher,
        isOrganizer: user.is_organizer,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Errore durante il login";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
