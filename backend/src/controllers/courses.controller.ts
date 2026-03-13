import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listCourses(_req: Request, res: Response) {
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

    res.json({ courses: mapped });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Errore nel recupero corsi",
      details: error.message,
    });
  }
}

