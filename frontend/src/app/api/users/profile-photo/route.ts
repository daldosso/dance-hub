import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function uploadProfilePicture(file: File, userId: number) {
  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "dance-hub/profiles",
        public_id: `user_${userId}_${Date.now()}`,
        transformation: [
          { width: 400, height: 400, crop: "fill" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      },
    );

    uploadStream.end(buffer);
  });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("profilePhoto");
    const userIdRaw = formData.get("userId");

    const userId = Number(userIdRaw);
    if (!userId) {
      return NextResponse.json(
        { error: "Utente non specificato" },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nessun file caricato" },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Solo immagini sono permesse" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File troppo grande (max 5MB)" },
        { status: 400 },
      );
    }

    const url = await uploadProfilePicture(file, userId);

    await prisma.users.update({
      where: { id: BigInt(userId) },
      data: { profile_picture_url: url },
    });

    return NextResponse.json({
      message: "Foto profilo aggiornata",
      profilePictureUrl: url,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'upload";
    return NextResponse.json(
      { error: "Errore durante l'upload", details: message },
      { status: 500 },
    );
  }
}
