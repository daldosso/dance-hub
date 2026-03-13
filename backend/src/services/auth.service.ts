import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET non definito in .env");

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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function registerUser(data: unknown) {
  const validated = registerSchema.parse(data);

  const existingUser = await prisma.users.findUnique({
    where: { email: validated.email },
  });

  if (existingUser) {
    throw new Error("Email già registrata");
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

  return {
    user: {
      id: Number(user.id),
      email: user.email,
      username: user.username,
    },
  };
}

export async function loginUser(data: unknown) {
  const { email, password } = loginSchema.parse(data);

  const user = await prisma.users.findUnique({
    where: { email },
  });

  if (!user || !user.password_hash) {
    throw new Error("Credenziali non valide");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error("Credenziali non valide");
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

  return {
    token,
    user: {
      id: Number(user.id),
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      isTeacher: user.is_teacher,
      isOrganizer: user.is_organizer,
    },
  };
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
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

  if (!user) throw new Error("Utente non trovato");

  return {
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
  };
}
