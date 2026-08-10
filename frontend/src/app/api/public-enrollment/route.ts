import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const publicEnrollmentSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(6),
  birthDate: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  skillLevel: z.string().optional().or(z.literal("")),
  courseId: z.number().int().positive().optional(),
  courseTitle: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  consent: z.literal(true),
});

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }

  return {
    firstName: parts.slice(0, 1).join(" "),
    lastName: parts.slice(1).join(" "),
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const parsed = publicEnrollmentSchema.parse(payload);

    const fullName = parsed.fullName.trim();
    const { firstName, lastName } = splitFullName(fullName);
    const normalizedCourseTitle = parsed.courseTitle?.trim() ?? "";
    const courseTags = normalizedCourseTitle ? [normalizedCourseTitle] : [];

    const user = await prisma.users.upsert({
      where: { email: parsed.email },
      create: {
        email: parsed.email,
        password_hash: null,
        full_name: fullName,
        city: parsed.city?.trim() || null,
        country: "Italia",
        birth_date: parsed.birthDate ? new Date(parsed.birthDate) : null,
        gender: parsed.gender?.trim() || null,
        bio: parsed.notes?.trim() || null,
        dance_styles: courseTags,
        skill_level: parsed.skillLevel?.trim() || null,
        is_active: true,
      },
      update: {
        full_name: fullName,
        city: parsed.city?.trim() || null,
        country: "Italia",
        birth_date: parsed.birthDate ? new Date(parsed.birthDate) : null,
        gender: parsed.gender?.trim() || null,
        bio: parsed.notes?.trim() || null,
        dance_styles: courseTags,
        skill_level: parsed.skillLevel?.trim() || null,
        is_active: true,
      },
    });

    if (parsed.courseId) {
      await prisma.course_enrollments.upsert({
        where: {
          course_id_user_id: {
            course_id: BigInt(parsed.courseId),
            user_id: user.id,
          },
        },
        create: {
          course_id: BigInt(parsed.courseId),
          user_id: user.id,
          start_date: new Date("2026-09-01"),
          end_date: new Date("2027-08-31"),
          status: "active",
        },
        update: {
          start_date: new Date("2026-09-01"),
          end_date: new Date("2027-08-31"),
          status: "active",
        },
      });
    }

    return NextResponse.json(
      {
        message: "Iscrizione registrata con successo",
        enrollment: {
          id: Number(user.id),
          fullName,
          firstName,
          lastName,
          email: user.email,
          courseTitle: normalizedCourseTitle || null,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'iscrizione";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
