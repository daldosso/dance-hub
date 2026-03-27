import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

type PaymentStatus = "paid" | "unpaid" | "suspended";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const records = await prisma.payments.findMany();

    return NextResponse.json({
      payments: records.map((r) => ({
        id: Number(r.id),
        userId: Number(r.user_id),
        courseId: r.course_id ? Number(r.course_id) : null,
        monthKey: r.month_key,
        status: r.status as PaymentStatus,
      })),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore nel caricamento dei pagamenti";
    return NextResponse.json(
      {
        error: "Errore nel caricamento dei pagamenti",
        details: message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const raw = (await req.json()) as Record<string, unknown>;
    const userIdNum = Number(raw.userId);
    const courseIdNum = Number(raw.courseId);
    const monthKey =
      typeof raw.monthKey === "string" ? raw.monthKey.trim() : "";
    const status =
      typeof raw.status === "string" ? raw.status.trim() : String(raw.status ?? "");

    if (Number.isNaN(userIdNum) || userIdNum < 1) {
      return NextResponse.json(
        {
          error: "Parametri non validi",
          details: "userId deve essere un numero positivo",
          received: { body: raw },
        },
        { status: 400 },
      );
    }
    if (Number.isNaN(courseIdNum) || courseIdNum < 1) {
      return NextResponse.json(
        {
          error: "Parametri non validi",
          details: "courseId deve essere un numero positivo",
          received: { body: raw },
        },
        { status: 400 },
      );
    }
    if (!monthKey) {
      return NextResponse.json(
        {
          error: "Parametri non validi",
          details: "monthKey e obbligatorio (es. 2025-09)",
          received: { body: raw },
        },
        { status: 400 },
      );
    }
    if (!["paid", "unpaid", "suspended"].includes(status)) {
      return NextResponse.json(
        {
          error: "Stato non valido",
          details: "status deve essere uno tra: paid, unpaid, suspended",
          received: { status },
        },
        { status: 400 },
      );
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

    return NextResponse.json({
      id: Number(record.id),
      userId: Number(record.user_id),
      courseId: record.course_id ? Number(record.course_id) : null,
      monthKey: record.month_key,
      status: record.status,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore nel salvataggio del pagamento";
    return NextResponse.json(
      {
        error: "Errore nel salvataggio del pagamento",
        details: message,
      },
      { status: 500 },
    );
  }
}
