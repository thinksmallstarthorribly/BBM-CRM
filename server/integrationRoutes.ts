import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getUserByOpenId, upsertUser } from "./db";
import { ingestChecklistPayload, type ChecklistWebhookPayload } from "./services/checklistIngestion";

const MAX_SIGNATURE_AGE_SECONDS = 300;

function verifyChecklistSignature(req: Request) {
  const secret = process.env.BBM_CHECKLIST_WEBHOOK_SECRET;
  if (!secret) return { valid: false, reason: "webhook-secret-not-configured" };
  const timestamp = req.header("x-bbm-timestamp") ?? "";
  const signature = req.header("x-bbm-signature") ?? "";
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return { valid: false, reason: "invalid-timestamp" };
  if (Math.abs(Date.now() / 1000 - timestampNumber) > MAX_SIGNATURE_AGE_SECONDS) return { valid: false, reason: "expired-signature" };
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${JSON.stringify(req.body)}`).digest("hex");
  const receivedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) return { valid: false, reason: "invalid-signature" };
  return { valid: true, reason: "ok" };
}

function checklistHealth(req: Request, res: Response) {
  const verification = verifyChecklistSignature(req);
  if (!verification.valid) return res.status(401).json({ ok: false, error: verification.reason });
  return res.json({ ok: true, integration: "psychic-cleaner-checklist" });
}

async function ensureOwner() {
  let owner = await getUserByOpenId(ENV.ownerOpenId);
  if (!owner) {
    await upsertUser({ openId: ENV.ownerOpenId, name: process.env.OWNER_NAME || "Alex Cooper", role: "admin", lastSignedIn: new Date() });
    owner = await getUserByOpenId(ENV.ownerOpenId);
  }
  if (!owner) throw new Error("Owner account is not initialized");
  return owner;
}

async function checklistWebhook(req: Request, res: Response) {
  const verification = verifyChecklistSignature(req);
  if (!verification.valid) return res.status(401).json({ ok: false, error: verification.reason });
  try {
    const owner = await ensureOwner();
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [req.body];
    if (!rows.length || rows.length > 250) return res.status(400).json({ ok: false, error: "rows must contain between 1 and 250 submissions" });
    const results = [];
    for (const row of rows as ChecklistWebhookPayload[]) results.push(await ingestChecklistPayload(owner.id, row));
    return res.json({ ok: true, received: rows.length, created: results.filter(item => !item.duplicate).length, duplicates: results.filter(item => item.duplicate).length, results });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Checklist ingestion failed", timestamp: new Date().toISOString() });
  }
}

export function registerIntegrationRoutes(app: Express) {
  app.post("/api/integrations/checklist/health", checklistHealth);
  app.post("/api/integrations/checklist", checklistWebhook);
}
