import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const courses = await prisma.courses.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        style_id: true,
        teacher_id: true,
        venue_id: true,
        start_date: true,
        end_date: true,
        day_of_week: true,
        start_time: true,
        end_time: true,
        price_per_month: true,
        max_students: true,
      },
      orderBy: {
        title: "asc",
      },
    });

    const mapped = courses.map((course) => ({
      id: Number(course.id),
      title: course.title,
      description: course.description,
      styleId: course.style_id ?? null,
      teacherId: course.teacher_id ? Number(course.teacher_id) : null,
      venueId: course.venue_id ? Number(course.venue_id) : null,
      startDate: course.start_date,
      endDate: course.end_date,
      dayOfWeek: course.day_of_week,
      startTime: course.start_time,
      endTime: course.end_time,
      pricePerMonth: course.price_per_month,
      maxStudents: course.max_students,
    }));

    return NextResponse.json({ courses: mapped });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Errore nel recupero corsi", details: error?.message },
      { status: 500 },
    );
  }
}
