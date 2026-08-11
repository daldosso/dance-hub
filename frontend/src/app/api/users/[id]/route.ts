import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

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
    });

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
