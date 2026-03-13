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
