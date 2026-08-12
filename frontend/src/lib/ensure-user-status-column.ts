import { prisma } from "@/lib/prisma";

let ensureUserStatusColumnPromise: Promise<void> | null = null;

export function ensureUserStatusColumn() {
  if (!ensureUserStatusColumnPromise) {
    ensureUserStatusColumnPromise = (async () => {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT \'Attivo\'',
      );
      await prisma.$executeRawUnsafe(
        'UPDATE "users" SET "status" = \'Attivo\' WHERE "status" IS NULL',
      );
    })();
  }

  return ensureUserStatusColumnPromise;
}
