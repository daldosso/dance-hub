import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definito nelle variabili d'ambiente");
}

export type AuthUser = { id: number; email: string; role: string };

export function getAuthUser(
  req: NextRequest,
):
  | { ok: true; user: AuthUser }
  | { ok: false; status: number; error: string } {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return { ok: false, status: 401, error: "Token mancante" };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return { ok: true, user: decoded };
  } catch {
    return { ok: false, status: 403, error: "Token non valido o scaduto" };
  }
}
