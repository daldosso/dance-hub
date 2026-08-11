import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const publicEnrollmentSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(6),
  birthDate: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  skillLevel: z.string().optional().or(z.literal("")),
  courseId: z.string().optional().or(z.literal("")),
  courseTitle: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  consent: z.literal(true),
});

async function uploadEnrollmentPhoto(file: File, fullName: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "guest";

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "dance-hub/enrollments",
        public_id: `enrollment_${safeName}_${Date.now()}`,
        transformation: [
          { width: 600, height: 600, crop: "fill" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      },
    );

    uploadStream.end(buffer);
  });
}

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
    const formData = await req.formData();
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      birthDate: String(formData.get("birthDate") ?? ""),
      city: String(formData.get("city") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      skillLevel: String(formData.get("skillLevel") ?? ""),
      courseId: String(formData.get("courseId") ?? ""),
      courseTitle: String(formData.get("courseTitle") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      consent: String(formData.get("consent") ?? "") === "true",
    };
    const parsed = publicEnrollmentSchema.parse(payload);
    const profilePhoto = formData.get("profilePhoto");

    const fullName = parsed.fullName.trim();
    const { firstName, lastName } = splitFullName(fullName);
    const normalizedCourseTitle = parsed.courseTitle?.trim() ?? "";
    const courseTags = normalizedCourseTitle ? [normalizedCourseTitle] : [];
    let profilePictureUrl: string | null = null;

    if (profilePhoto instanceof File && profilePhoto.size > 0) {
      if (!profilePhoto.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "La foto deve essere un'immagine" },
          { status: 400 },
        );
      }

      if (profilePhoto.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "La foto è troppo grande (max 5MB)" },
          { status: 400 },
        );
      }

      profilePictureUrl = await uploadEnrollmentPhoto(profilePhoto, fullName);
    }

    const user = await prisma.users.upsert({
      where: { email: parsed.email },
      create: {
        email: parsed.email,
        password_hash: null,
        full_name: fullName,
        profile_picture_url: profilePictureUrl,
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
        profile_picture_url: profilePictureUrl ?? undefined,
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
