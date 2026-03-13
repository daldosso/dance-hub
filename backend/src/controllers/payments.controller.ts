import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PaymentStatus = "paid" | "unpaid" | "suspended";

export async function upsertPayment(req: Request, res: Response) {
  try {
    const { userId, courseId, monthKey, status } = req.body as {
      userId?: number;
      courseId?: number | null;
      monthKey?: string;
      status?: PaymentStatus;
    };

    if (!userId || !monthKey || !status) {
      return res.status(400).json({
        error: "Parametri mancanti",
        details: "userId, monthKey e status sono obbligatori",
      });
    }

    if (!["paid", "unpaid", "suspended"].includes(status)) {
      return res.status(400).json({
        error: "Stato non valido",
        details: "status deve essere uno tra paid, unpaid, suspended",
      });
    }

    const courseIdValue =
      typeof courseId === "number" && !Number.isNaN(courseId)
        ? BigInt(courseId)
        : (null as unknown as bigint);

    const record = await prisma.payments.upsert({
      where: {
        user_id_course_id_month_key: {
          user_id: BigInt(userId),
          course_id: courseIdValue as any,
          month_key: monthKey,
        },
      },
      update: {
        status,
        updated_at: new Date(),
      },
      create: {
        user_id: BigInt(userId),
        course_id: courseIdValue as any,
        month_key: monthKey,
        status,
      },
    });

    res.json({
      id: Number(record.id),
      userId: Number(record.user_id),
      courseId: record.course_id ? Number(record.course_id) : null,
      monthKey: record.month_key,
      status: record.status,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Errore nel salvataggio del pagamento",
      details: error.message,
    });
  }
}

