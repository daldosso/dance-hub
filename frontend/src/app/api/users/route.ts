import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserStatusColumn } from "@/lib/ensure-user-status-column";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureUserStatusColumn();

    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        full_name: true,
        gender: true,
        city: true,
        birth_date: true,
        birth_place: true,
        codice_fiscale: true,
        dance_styles: true,
        skill_level: true,
        status: true,
        is_teacher: true,
        is_organizer: true,
        profile_picture_url: true,
        residence_address: true,
        residence_province: true,
        residence_postal_code: true,
        privacy_image_consent: true,
        privacy_marketing_consent: true,
        privacy_minor_consent: true,
        course_enrollments: {
          select: {
            course_id: true,
            courses: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const mapped = users.map((user) => {
      const courses =
        user.course_enrollments
          ?.map((ce) => ce.courses)
          .filter((c): c is { id: bigint; title: string } => Boolean(c)) ?? [];

      return {
        id: Number(user.id),
        email: user.email,
        phone: user.phone,
        username: user.username,
        fullName: user.full_name,
        gender: user.gender,
        city: user.city,
        dataNascita: user.birth_date,
        birthPlace: user.birth_place,
        codiceFiscale: user.codice_fiscale,
        danceStyles: user.dance_styles,
        skillLevel: user.skill_level,
        status: user.status,
        isTeacher: user.is_teacher,
        isOrganizer: user.is_organizer,
        profilePictureUrl: user.profile_picture_url,
        residenceAddress: user.residence_address,
        residenceProvince: user.residence_province,
        residencePostalCode: user.residence_postal_code,
        privacyImageConsent: user.privacy_image_consent,
        privacyMarketingConsent: user.privacy_marketing_consent,
        privacyMinorConsent: user.privacy_minor_consent,
        courses: courses.map((c) => ({
          id: Number(c.id),
          title: c.title,
        })),
      };
    });

    return NextResponse.json({ users: mapped });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Errore nel recupero utenti";
    return NextResponse.json(
      { error: "Errore nel recupero utenti", details: message },
      { status: 500 },
    );
  }
}
