import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ensureUserStatusColumn } from "@/lib/ensure-user-status-column";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

type UpdateUserBody = {
  nome?: unknown;
  cognome?: unknown;
  email?: unknown;
  corso?: unknown;
  livello?: unknown;
  stato?: unknown;
  note?: unknown;
  dataNascita?: unknown;
  luogoNascita?: unknown;
  sesso?: unknown;
};

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown) {
  const trimmed = getTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
}

function parseDateValue(value: unknown) {
  const trimmed = getTrimmedString(value);
  if (!trimmed) return null;

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSkillLevel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (
    ["principiante", "beginner", "base", "novice"].includes(normalized)
  ) {
    return "beginner";
  }

  if (["intermedio", "intermediate"].includes(normalized)) {
    return "intermediate";
  }

  if (["avanzato", "advanced", "pro"].includes(normalized)) {
    return "advanced";
  }

  return value.trim();
}

async function serializeUser(userId: number) {
  const user = await prisma.users.findUnique({
    where: { id: BigInt(userId) },
    select: {
      id: true,
      email: true,
      username: true,
      full_name: true,
      city: true,
      dance_styles: true,
      skill_level: true,
      status: true,
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

  if (!user) {
    return null;
  }

  const courses =
    user.course_enrollments
      ?.map((enrollment) => enrollment.courses)
      .filter((course): course is { id: bigint; title: string } =>
        Boolean(course),
      ) ?? [];

  return {
    id: Number(user.id),
    email: user.email,
    username: user.username,
    fullName: user.full_name,
    city: user.city,
    danceStyles: user.dance_styles,
    skillLevel: user.skill_level,
    status: user.status,
    profilePictureUrl: user.profile_picture_url,
    courses: courses.map((course) => ({
      id: Number(course.id),
      title: course.title,
    })),
  };
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = getAuthUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await ensureUserStatusColumn();

    const userId = Number(context.params.id);

    if (!Number.isInteger(userId) || userId < 1) {
      return NextResponse.json(
        {
          error: "ID non valido",
          details: "L'id dell'iscritto deve essere un numero intero positivo",
        },
        { status: 400 },
      );
    }

    const raw = (await req.json()) as UpdateUserBody;
    const nome = getTrimmedString(raw.nome);
    const cognome = getTrimmedString(raw.cognome);
    const email = getTrimmedString(raw.email);
    const corso = getTrimmedString(raw.corso);
    const livello = getTrimmedString(raw.livello);
    const stato = getTrimmedString(raw.stato);

    if (!nome || !cognome || !corso) {
      return NextResponse.json(
        {
          error: "Parametri non validi",
          details: "Nome, cognome e corso sono obbligatori",
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.users.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Iscritto non trovato" },
        { status: 404 },
      );
    }

    if (email) {
      const duplicate = await prisma.users.findFirst({
        where: {
          email,
          NOT: {
            id: BigInt(userId),
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error: "Email già registrata",
            details: "Esiste già un altro iscritto con questa email",
          },
          { status: 409 },
        );
      }
    }

    const matchedCourse = await prisma.courses.findFirst({
      where: {
        title: {
          equals: corso,
          mode: "insensitive",
        },
      },
      select: { id: true, title: true },
    });

    const skillLevel = normalizeSkillLevel(livello);
    const status = stato || "Attivo";
    const fullName = `${nome} ${cognome}`.trim();
    const notes = getNullableString(raw.note);
    const birthDate = parseDateValue(raw.dataNascita);
    const birthplace = getNullableString(raw.luogoNascita);
    const gender = getNullableString(raw.sesso);

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: BigInt(userId) },
        data: {
          email: email || undefined,
          full_name: fullName,
          bio: notes ?? undefined,
          birth_date: birthDate ?? undefined,
          city: birthplace ?? undefined,
          gender: gender ?? undefined,
          dance_styles: [corso],
          skill_level: skillLevel ?? undefined,
          status,
          updated_at: new Date(),
        },
      });

      await tx.course_enrollments.deleteMany({
        where: { user_id: BigInt(userId) },
      });

      if (matchedCourse) {
        await tx.course_enrollments.create({
          data: {
            course_id: matchedCourse.id,
            user_id: BigInt(userId),
            start_date: new Date(),
            status: "active",
          },
        });
      }
    });

    const updatedUser = await serializeUser(userId);

    return NextResponse.json({
      message: "Iscritto aggiornato con successo",
      user: updatedUser,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'aggiornamento";
    return NextResponse.json(
      {
        error: "Errore durante l'aggiornamento",
        details: message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = getAuthUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = context.params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId < 1) {
      return NextResponse.json(
        {
          error: "ID non valido",
          details: "L'id dell'iscritto deve essere un numero intero positivo",
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.users.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        teachers: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Iscritto non trovato" },
        { status: 404 },
      );
    }

    const organizedEvents = await prisma.events.findMany({
      where: { organizer_id: BigInt(userId) },
      select: { id: true },
    });
    const organizedEventIds = organizedEvents.map((event) => event.id);

    await prisma.$transaction(async (tx) => {
      await tx.course_enrollments.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.event_participations.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.message_reads.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.notifications.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.reviews.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.user_dance_styles.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.video_likes.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.payments.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.conversation_participants.deleteMany({
        where: { user_id: BigInt(userId) },
      });
      await tx.follows.deleteMany({ where: { follower_id: BigInt(userId) } });
      await tx.follows.deleteMany({ where: { following_id: BigInt(userId) } });
      await tx.transactions.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.event_participations.deleteMany({
        where: { event_id: { in: organizedEventIds } },
      });
      await tx.reviews.deleteMany({
        where: { event_id: { in: organizedEventIds } },
      });
      await tx.videos.deleteMany({
        where: { event_id: { in: organizedEventIds } },
      });
      await tx.transactions.deleteMany({
        where: { event_id: { in: organizedEventIds } },
      });
      await tx.messages.deleteMany({ where: { sender_id: BigInt(userId) } });
      await tx.videos.deleteMany({ where: { uploader_id: BigInt(userId) } });
      await tx.events.deleteMany({ where: { organizer_id: BigInt(userId) } });
      await tx.teachers.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.courses.updateMany({
        where: { teacher_id: BigInt(userId) },
        data: { teacher_id: null },
      });
      await tx.venues.updateMany({
        where: { created_by: BigInt(userId) },
        data: { created_by: null },
      });
      await tx.users.delete({ where: { id: BigInt(userId) } });
    }, { timeout: 20000, maxWait: 20000 });

    return NextResponse.json({
      message: "Iscritto eliminato con successo",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'eliminazione";

    return NextResponse.json(
      {
        error: "Errore durante l'eliminazione",
        details: message,
      },
      { status: 500 },
    );
  }
}
