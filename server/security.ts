import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { pool } from "./db";

const secret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
const cookieName = "dailytask_session";
export function publicUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    department: u.department,
    avatarUrl: u.avatar_url,
    status: u.status,
    createdAt: u.created_at,
  };
}
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string | null) {
  if (!stored || typeof password !== "string") return false;
  if (!stored.startsWith("scrypt:")) return stored === password; // Compatibilidad con cuentas existentes.
  const [, salt, hash] = stored.split(":");
  const expected = Buffer.from(hash || "", "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function startSession(res: Response, id: string) {
  const payload = Buffer.from(
    JSON.stringify({ id, expires: Date.now() + 7 * 86400000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  res.cookie(cookieName, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000,
    path: "/",
  });
}
export function endSession(res: Response) {
  res.clearCookie(cookieName, { path: "/" });
}
export function sessionId(req: Request): string | null {
  try {
    const token = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (!token) return null;
    const [payload, signature] = token.split(".");
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature || "", "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.expires > Date.now() ? data.id : null;
  } catch {
    return null;
  }
}
export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = sessionId(req);
    const result = id
      ? await pool.query("SELECT * FROM users WHERE id = $1 AND status = $2", [
          id,
          "active",
        ])
      : null;
    if (!result?.rows[0])
      return res.status(401).json({ error: "Inicie sesión para continuar." });
    res.locals.user = result.rows[0];
    next();
  } catch {
    res.status(503).json({ error: "No se pudo verificar la sesión." });
  }
}
export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  if (res.locals.user?.role !== "admin")
    return res
      .status(403)
      .json({ error: "Solo el administrador puede realizar esta acción." });
  next();
}
