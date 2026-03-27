import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        city: true,
        dance_styles: true,
        skill_level: true,
        is_teacher: true,
        is_organizer: true,
        profile_picture_url: true,
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
        username: user.username,
        fullName: user.full_name,
        city: user.city,
        danceStyles: user.dance_styles,
        skillLevel: user.skill_level,
        isTeacher: user.is_teacher,
        isOrganizer: user.is_organizer,
        profilePictureUrl: user.profile_picture_url,
        courses: courses.map((c) => ({
          id: Number(c.id),
          title: c.title,
        })),
      };
    });

    return NextResponse.json({ users: mapped });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Errore nel recupero utenti", details: error?.message },
      { status: 500 },
    );
  }
}
