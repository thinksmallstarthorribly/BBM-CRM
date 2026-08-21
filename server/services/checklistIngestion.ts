import { and, eq } from "drizzle-orm";
import { automationSettings, checklistResponses, leadInteractions, leads } from "../../drizzle/schema";
import { requireDb } from "../db";

export type ChecklistWebhookPayload = {
  externalId?: unknown;
  id?: unknown;
  sourceSheet?: unknown;
  submittedAt?: unknown;
  timestamp?: unknown;
  businessName?: unknown;
  business?: unknown;
  contactName?: unknown;
  contact?: unknown;
  email?: unknown;
  phone?: unknown;
  score?: unknown;
  checklistScore?: unknown;
  tier?: unknown;
  campaignSource?: unknown;
  source?: unknown;
  [key: string]: unknown;
};

export function checklistDeduplicationKey(ownerId: number, externalId: string) {
  return `${ownerId}:${externalId.trim()}`;
}

function text(value: unknown, max: number) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, max) : null;
}

function integer(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function date(value: unknown) {
  const parsed = value ? new Date(String(value)) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function ingestChecklistPayload(ownerId: number, payload: ChecklistWebhookPayload) {
  const db = await requireDb();
  const externalId = text(payload.externalId ?? payload.id, 255);
  const businessName = text(payload.businessName ?? payload.business, 255);
  if (!externalId) throw new Error("externalId is required for idempotent ingestion");
  if (!businessName) throw new Error("businessName is required");
  checklistDeduplicationKey(ownerId, externalId);

  const existing = (await db.select().from(checklistResponses).where(and(eq(checklistResponses.ownerId, ownerId), eq(checklistResponses.externalId, externalId))).limit(1))[0];
  if (existing) return { checklistResponseId: existing.id, leadId: existing.leadId, duplicate: true };

  const result = await db.transaction(async transaction => {
    const submittedAt = date(payload.submittedAt ?? payload.timestamp);
    const score = integer(payload.score ?? payload.checklistScore);
    const tier = text(payload.tier, 64);
    const campaignSource = text(payload.campaignSource ?? payload.source, 160);
    const contactName = text(payload.contactName ?? payload.contact, 255);
    const email = text(payload.email, 320);
    const phone = text(payload.phone, 64);
    const responseRows = await transaction.insert(checklistResponses).values({
      ownerId,
      externalId,
      sourceSheet: text(payload.sourceSheet, 255),
      submittedAt,
      businessName,
      contactName,
      email,
      phone,
      score,
      tier,
      campaignSource,
      payload,
    }).$returningId();
    const checklistResponseId = responseRows[0]?.id;
    if (!checklistResponseId) throw new Error("Checklist response could not be stored");

    const leadRows = await transaction.insert(leads).values({
      ownerId,
      businessName,
      contactName,
      email,
      phone,
      stage: "New",
      checklistScore: score,
      tier,
      source: campaignSource ? `Psychic Cleaner Checklist · ${campaignSource}` : "Psychic Cleaner Checklist",
      notes: "Automatically ingested from the Psychic Cleaner Checklist on bigbluemop.com.au.",
    }).$returningId();
    const leadId = leadRows[0]?.id;
    if (!leadId) throw new Error("Checklist lead could not be created");

    await transaction.update(checklistResponses).set({ leadId }).where(eq(checklistResponses.id, checklistResponseId));
    await transaction.insert(leadInteractions).values({
      ownerId,
      leadId,
      type: "system",
      subject: "Psychic Cleaner Checklist received",
      body: `Checklist score: ${score ?? "not supplied"}. Tier: ${tier ?? "not supplied"}. Source: ${campaignSource ?? "Website"}.`,
      occurredAt: submittedAt,
    });
    return { checklistResponseId, leadId, duplicate: false };
  });

  await db.insert(automationSettings).values({ ownerId, sheetsSyncEnabled: true, sheetsWebhookLastReceivedAt: new Date() }).onDuplicateKeyUpdate({ set: { sheetsSyncEnabled: true, sheetsWebhookLastReceivedAt: new Date() } });
  return result;
}
