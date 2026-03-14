import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PaymentStatus = "paid" | "unpaid" | "suspended";

export async function upsertPayment(req: Request, res: Response) {
  try {
    const raw = (req.body || {}) as Record<string, unknown>;
    const userIdNum = Number(raw.userId);
    const courseIdNum = Number(raw.courseId);
    const monthKey =
      typeof raw.monthKey === "string" ? raw.monthKey.trim() : "";
    const status =
      typeof raw.status === "string" ? raw.status.trim() : String(raw.status ?? "");

    if (Number.isNaN(userIdNum) || userIdNum < 1) {
      return res.status(400).json({
        error: "Parametri non validi",
        details: "userId deve essere un numero positivo",
        received: { body: req.body },
      });
    }
    if (Number.isNaN(courseIdNum) || courseIdNum < 1) {
      return res.status(400).json({
        error: "Parametri non validi",
        details: "courseId deve essere un numero positivo",
        received: { body: req.body },
      });
    }
    if (!monthKey) {
      return res.status(400).json({
        error: "Parametri non validi",
        details: "monthKey è obbligatorio (es. 2025-09)",
        received: { body: req.body },
      });
    }
    if (!["paid", "unpaid", "suspended"].includes(status)) {
      return res.status(400).json({
        error: "Stato non valido",
        details: "status deve essere uno tra: paid, unpaid, suspended",
        received: { status },
      });
    }

    const courseIdValue = BigInt(courseIdNum);

    const record = await prisma.payments.upsert({
      where: {
        user_id_course_id_month_key: {
          user_id: BigInt(userIdNum),
          course_id: courseIdValue,
          month_key: monthKey,
        },
      },
      update: {
        status,
        updated_at: new Date(),
      },
      create: {
        user_id: BigInt(userIdNum),
        course_id: courseIdValue,
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

