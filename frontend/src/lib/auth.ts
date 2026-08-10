import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

export type AuthUser = { id: number; email: string; role: string };

type DecodedJwt = { id?: number; email?: string; role?: string };

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
    const jwtSecret = process.env.JWT_SECRET ?? "";
    if (!jwtSecret) {
      return {
        ok: false,
        status: 500,
        error: "JWT_SECRET non configurato",
      };
    }

    const decoded = jwt.verify(token, jwtSecret) as unknown as DecodedJwt;
    if (!decoded || !decoded.id || !decoded.email || !decoded.role) {
      return { ok: false, status: 403, error: "Token non valido o scaduto" };
    }

    return {
      ok: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      },
    };
  } catch {
    return { ok: false, status: 403, error: "Token non valido o scaduto" };
  }
}
