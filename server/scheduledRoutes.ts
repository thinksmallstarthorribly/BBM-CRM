import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { automationSettings } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { requireDb } from "./db";
import { generateMorningBriefing } from "./services/ai";

async function morningBriefingHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const db = await requireDb();
    const setting = (await db.select().from(automationSettings).where(eq(automationSettings.morningBriefingCronTaskUid, user.taskUid)).limit(1))[0];
    if (!setting) return res.json({ ok: true, skipped: "orphan" });
    if (!setting.morningBriefingEnabled) return res.json({ ok: true, skipped: "disabled" });
    const briefing = await generateMorningBriefing(setting.ownerId);
    return res.json({ ok: true, briefingDate: briefing.briefingDate, model: briefing.model });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Morning briefing failed", stack: error instanceof Error ? error.stack : undefined, context: { url: req.originalUrl }, timestamp: new Date().toISOString() });
  }
}

export function registerScheduledRoutes(app: Express) {
  app.post("/api/scheduled/morning-briefing", morningBriefingHandler);
}
