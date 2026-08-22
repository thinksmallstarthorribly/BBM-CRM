import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { users, type User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";

const scryptAsync = promisify(scrypt);

export type LocalSessionPayload = { openId: string; email: string; name: string };

function sessionSecret() {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET || "";
  if (!secret) throw new Error("JWT_SECRET is required for local auth");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function ownerOpenIdFromEmail(email: string) {
  return `local:${email.trim().toLowerCase()}`;
}

export async function signLocalSession(payload: LocalSessionPayload, expiresInMs = ONE_YEAR_MS) {
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({ openId: payload.openId, email: payload.email, name: payload.name, auth: "local" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(sessionSecret());
}

export async function verifyLocalSession(token: string | undefined | null): Promise<LocalSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    const openId = typeof payload.openId === "string" ? payload.openId : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = typeof payload.name === "string" ? payload.name : "";
    if (!openId || !email) return null;
    return { openId, email, name };
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const database = await db.getDb();
  if (!database) return undefined;
  const rows = await database.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  return rows[0];
}

export async function ensureOwnerFromEnv(): Promise<User | null> {
  const email = (process.env.OWNER_EMAIL || ENV.ownerEmail || "").trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD || "";
  const name = process.env.OWNER_NAME || "Alex";
  if (!email || !password) {
    console.warn("[Auth] OWNER_EMAIL / OWNER_PASSWORD not set — owner seed skipped");
    return null;
  }
  const database = await db.getDb();
  if (!database) {
    console.warn("[Auth] Database unavailable — owner seed skipped");
    return null;
  }
  const openId = ownerOpenIdFromEmail(email);
  const passwordHash = await hashPassword(password);
  const existing = await getUserByEmail(email);
  if (existing) {
    await database.update(users).set({ passwordHash, name, role: "admin", loginMethod: "password", lastSignedIn: new Date() }).where(eq(users.id, existing.id));
    return (await getUserByEmail(email)) ?? null;
  }
  await db.upsertUser({ openId, email, name, role: "admin", loginMethod: "password", lastSignedIn: new Date() });
  await database.update(users).set({ passwordHash }).where(eq(users.openId, openId));
  return (await getUserByEmail(email)) ?? null;
}

export async function authenticateLocalRequest(req: Request): Promise<User | null> {
  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader.split(";").map(p => p.trim()).find(p => p.startsWith(`${COOKIE_NAME}=`));
  let token = match ? decodeURIComponent(match.slice(COOKIE_NAME.length + 1)) : null;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
  }
  const session = await verifyLocalSession(token);
  if (!session) return null;
  let user = await db.getUserByOpenId(session.openId);
  if (!user && session.email) user = await getUserByEmail(session.email);
  return user ?? null;
}

export async function loginWithPassword(email: string, password: string): Promise<{ user: User; token: string } | { error: string }> {
  const normalized = email.trim().toLowerCase();
  const ownerEmail = (process.env.OWNER_EMAIL || ENV.ownerEmail || "").trim().toLowerCase();
  if (ownerEmail && normalized !== ownerEmail) return { error: "Invalid email or password" };
  await ensureOwnerFromEnv();
  const user = await getUserByEmail(normalized);
  if (!user?.passwordHash) return { error: "Invalid email or password" };
  if (!(await verifyPassword(password, user.passwordHash))) return { error: "Invalid email or password" };
  const token = await signLocalSession({ openId: user.openId, email: user.email || normalized, name: user.name || "Alex" });
  const database = await db.getDb();
  if (database) await database.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return { user, token };
}

export function setSessionCookie(req: Request, res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
}

export function clearSessionCookie(req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
}
