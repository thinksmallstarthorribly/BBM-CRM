import { ACTIVE_LEAD_STAGES } from "@shared/crm";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { aiBriefings, automationSettings, invoices, jobs, leadInteractions, leads, reviewSignals, templates } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { requireDb } from "../db";

const MODEL = "gpt-5-mini";
const briefingSchema = z.object({ summary: z.string().min(1), priorities: z.array(z.string()).max(8), risks: z.array(z.string()).max(8), opportunities: z.array(z.string()).max(8) });
const scoreSchema = z.object({ score: z.number().int().min(0).max(100), reason: z.string().min(1), signals: z.array(z.string()).max(8) });
const followUpSchema = z.object({ recommendedAction: z.string().min(1), suggestedMessage: z.string().min(1), urgency: z.enum(["low", "medium", "high"]), rationale: z.string().min(1) });

function extractJson(response: Awaited<ReturnType<typeof invokeLLM>>) {
  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string") throw new Error("AI returned no structured content");
  return JSON.parse(content) as unknown;
}

function perthDay() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return new Date(Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)));
}

export function fallbackBriefing(input: { activeLeads: number; outstanding: number; upcomingJobs: number; overdue: number }) {
  const priorities = [input.activeLeads ? `Work the highest-scoring opportunities across ${input.activeLeads} active leads.` : "Add or ingest the next qualified commercial lead.", input.outstanding ? `Follow up ${input.outstanding} outstanding invoices.` : "Keep invoice records current."].filter(Boolean);
  const risks = input.overdue ? [`${input.overdue} invoices are overdue and need direct follow-up.`] : [];
  const opportunities = input.upcomingJobs ? [`There are ${input.upcomingJobs} upcoming jobs to confirm and prepare.`] : ["Use Local to identify the next Perth prospecting run."];
  return { summary: `Big Blue Mop has ${input.activeLeads} active leads, ${input.upcomingJobs} upcoming jobs and ${input.outstanding} outstanding invoices requiring attention.`, priorities, risks, opportunities };
}

export function deterministicLeadScore(input: { checklistScore: number | null; reviewSignalScore: number | null; interactionCount: number }) {
  return Math.max(0, Math.min(100, Math.round((input.checklistScore ?? 25) * 0.55 + (input.reviewSignalScore ?? 0) * 0.35 + Math.min(input.interactionCount, 10))));
}

export async function generateMorningBriefing(ownerId: number) {
  const db = await requireDb();
  const now = new Date();
  const [activeLeads, outstandingInvoices, upcomingJobs, hotSignals] = await Promise.all([
    db.select({ id: leads.id, businessName: leads.businessName, stage: leads.stage, checklistScore: leads.checklistScore, aiLeadScore: leads.aiLeadScore, nextAction: leads.nextAction, nextActionAt: leads.nextActionAt }).from(leads).where(and(eq(leads.ownerId, ownerId), inArray(leads.stage, ACTIVE_LEAD_STAGES))).orderBy(desc(leads.updatedAt)).limit(30),
    db.select({ invoiceNumber: invoices.invoiceNumber, amountCents: invoices.amountCents, status: invoices.status, dueAt: invoices.dueAt }).from(invoices).where(and(eq(invoices.ownerId, ownerId), inArray(invoices.status, ["sent", "outstanding", "overdue"]))).orderBy(invoices.dueAt).limit(30),
    db.select({ title: jobs.title, status: jobs.status, scheduledStart: jobs.scheduledStart }).from(jobs).where(and(eq(jobs.ownerId, ownerId), eq(jobs.status, "scheduled"), gte(jobs.scheduledStart, now))).orderBy(jobs.scheduledStart).limit(20),
    db.select({ businessName: reviewSignals.businessName, signalScore: reviewSignals.signalScore, rating: reviewSignals.rating, keyIssues: reviewSignals.keyIssues }).from(reviewSignals).where(eq(reviewSignals.ownerId, ownerId)).orderBy(desc(reviewSignals.signalScore)).limit(10),
  ]);
  const fallback = fallbackBriefing({ activeLeads: activeLeads.length, outstanding: outstandingInvoices.length, upcomingJobs: upcomingJobs.length, overdue: outstandingInvoices.filter(item => item.status === "overdue" || (item.dueAt && item.dueAt < now)).length });
  let briefing = fallback;
  let model = "deterministic-fallback";
  try {
    const response = await invokeLLM({
      model: MODEL,
      messages: [
        { role: "system", content: "You are the operations analyst for Big Blue Mop, a Perth commercial cleaning business. Return concise, direct Australian-English operational guidance. Use only the supplied CRM facts. Never invent customers, amounts or events." },
        { role: "user", content: JSON.stringify({ localDate: perthDay().toISOString().slice(0, 10), activeLeads, outstandingInvoices, upcomingJobs, hotGoogleReviewSignals: hotSignals }) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "bbm_morning_briefing", strict: true, schema: { type: "object", properties: { summary: { type: "string" }, priorities: { type: "array", items: { type: "string" }, maxItems: 8 }, risks: { type: "array", items: { type: "string" }, maxItems: 8 }, opportunities: { type: "array", items: { type: "string" }, maxItems: 8 } }, required: ["summary", "priorities", "risks", "opportunities"], additionalProperties: false } } },
    });
    briefing = briefingSchema.parse(extractJson(response));
    model = MODEL;
  } catch (error) {
    console.warn("[AI] Morning briefing fallback used:", error);
  }
  const briefingDate = perthDay();
  await db.insert(aiBriefings).values({ ownerId, briefingDate, ...briefing, model, generatedAt: new Date() }).onDuplicateKeyUpdate({ set: { ...briefing, model, generatedAt: new Date() } });
  await db.insert(automationSettings).values({ ownerId, lastMorningBriefingAt: new Date() }).onDuplicateKeyUpdate({ set: { lastMorningBriefingAt: new Date() } });
  return { ...briefing, model, briefingDate };
}

export async function scoreLead(ownerId: number, leadId: number) {
  const db = await requireDb();
  const lead = (await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerId, ownerId))).limit(1))[0];
  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  const [timeline, signal] = await Promise.all([
    db.select({ type: leadInteractions.type, subject: leadInteractions.subject, body: leadInteractions.body, occurredAt: leadInteractions.occurredAt }).from(leadInteractions).where(and(eq(leadInteractions.ownerId, ownerId), eq(leadInteractions.leadId, leadId))).orderBy(desc(leadInteractions.occurredAt)).limit(20),
    lead.googlePlaceId ? db.select().from(reviewSignals).where(and(eq(reviewSignals.ownerId, ownerId), eq(reviewSignals.googlePlaceId, lead.googlePlaceId))).limit(1).then(rows => rows[0] ?? null) : Promise.resolve(null),
  ]);
  const deterministicScore = deterministicLeadScore({ checklistScore: lead.checklistScore, reviewSignalScore: signal?.signalScore ?? lead.reviewSignalScore, interactionCount: timeline.length });
  let result = { score: deterministicScore, reason: "Calculated from checklist score, Google review opportunity signal and recorded engagement.", signals: [lead.checklistScore !== null ? `Checklist ${lead.checklistScore}` : "No checklist score", signal ? `Review signal ${signal.signalScore}` : "No saved review signal", `${timeline.length} interactions`] };
  try {
    const response = await invokeLLM({ model: MODEL, messages: [{ role: "system", content: "Score a commercial cleaning lead for Big Blue Mop from 0 to 100. Weight buying intent, cleaning pain, review evidence, commercial fit and engagement. Use only supplied facts. Return JSON." }, { role: "user", content: JSON.stringify({ lead, reviewSignal: signal, recentInteractions: timeline }) }], response_format: { type: "json_schema", json_schema: { name: "bbm_lead_score", strict: true, schema: { type: "object", properties: { score: { type: "integer", minimum: 0, maximum: 100 }, reason: { type: "string" }, signals: { type: "array", items: { type: "string" }, maxItems: 8 } }, required: ["score", "reason", "signals"], additionalProperties: false } } } });
    result = scoreSchema.parse(extractJson(response));
  } catch (error) {
    console.warn("[AI] Lead scoring fallback used:", error);
  }
  await db.update(leads).set({ aiLeadScore: result.score, aiScoreReason: result.reason, reviewSignalScore: signal?.signalScore ?? lead.reviewSignalScore }).where(and(eq(leads.id, leadId), eq(leads.ownerId, ownerId)));
  return result;
}

export async function suggestFollowUp(ownerId: number, leadId: number) {
  const db = await requireDb();
  const lead = (await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.ownerId, ownerId))).limit(1))[0];
  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  const [timeline, messageTemplates] = await Promise.all([
    db.select({ type: leadInteractions.type, subject: leadInteractions.subject, body: leadInteractions.body, occurredAt: leadInteractions.occurredAt }).from(leadInteractions).where(and(eq(leadInteractions.ownerId, ownerId), eq(leadInteractions.leadId, leadId))).orderBy(desc(leadInteractions.occurredAt)).limit(20),
    db.select({ name: templates.name, subject: templates.subject, body: templates.body }).from(templates).where(and(eq(templates.ownerId, ownerId), eq(templates.isActive, true))).limit(10),
  ]);
  const fallback = { recommendedAction: lead.nextAction || "Make a direct follow-up call and confirm the next commercial decision.", suggestedMessage: `Hi ${lead.contactName || "there"}, Alex from Big Blue Mop here. I’m following up about commercial cleaning for ${lead.businessName}. What would be the most useful next step from your side?`, urgency: (lead.stage === "Quote Sent" ? "high" : "medium") as "low" | "medium" | "high", rationale: `The lead is currently at ${lead.stage} with ${timeline.length} recorded interactions.` };
  try {
    const response = await invokeLLM({ model: MODEL, messages: [{ role: "system", content: "Recommend the next follow-up for Big Blue Mop. Be direct, commercially useful and concise. Write as Alex Cooper in Australian English. Do not invent pricing, promises or facts. Return JSON." }, { role: "user", content: JSON.stringify({ lead, recentInteractions: timeline, availableTemplates: messageTemplates }) }], response_format: { type: "json_schema", json_schema: { name: "bbm_follow_up", strict: true, schema: { type: "object", properties: { recommendedAction: { type: "string" }, suggestedMessage: { type: "string" }, urgency: { type: "string", enum: ["low", "medium", "high"] }, rationale: { type: "string" } }, required: ["recommendedAction", "suggestedMessage", "urgency", "rationale"], additionalProperties: false } } } });
    return followUpSchema.parse(extractJson(response));
  } catch (error) {
    console.warn("[AI] Follow-up suggestion fallback used:", error);
    return fallback;
  }
}
