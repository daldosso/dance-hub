import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { uploadProfilePicture } from "../services/upload.service";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();

export async function listUsers(req: Request, res: Response) {
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

    res.json({ users: mapped });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Errore nel recupero utenti", details: error.message });
  }
}

export async function uploadProfilePhoto(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Utente non autenticato" });
    }

    const targetUserId = Number(req.body.userId);

    if (!targetUserId) {
      return res.status(400).json({ error: "Utente non specificato" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nessun file caricato" });
    }

    const url = await uploadProfilePicture(req.file, targetUserId);

    await prisma.users.update({
      where: { id: targetUserId },
      data: { profile_picture_url: url },
    });

    res.json({
      message: "Foto profilo aggiornata",
      profilePictureUrl: url,
    });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Errore durante l'upload", details: error.message });
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Utente non autenticato" });
    }

    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({
        error: "ID non valido",
        details: "L'id dell'iscritto deve essere un numero intero positivo",
      });
    }

    const existingUser = await prisma.users.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "Iscritto non trovato" });
    }

    const organizedEvents = await prisma.events.findMany({
      where: { organizer_id: BigInt(userId) },
      select: { id: true },
    });
    const organizedEventIds = organizedEvents.map((event) => event.id);

    await prisma.$transaction(async (tx) => {
      await tx.course_enrollments.deleteMany({
        where: { user_id: BigInt(userId) },
      });
      await tx.event_participations.deleteMany({
        where: { user_id: BigInt(userId) },
      });
      await tx.message_reads.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.notifications.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.reviews.deleteMany({ where: { user_id: BigInt(userId) } });
      await tx.user_dance_styles.deleteMany({
        where: { user_id: BigInt(userId) },
      });
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

    return res.json({ message: "Iscritto eliminato con successo" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      error: "Errore durante l'eliminazione",
      details: error.message,
    });
  }
}
