import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { campaigns, checklistResponses, emailActivities, leadInteractions, leads, reviewSignals, routeStops, routes, templates } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { requireDb } from "../db";
import { ownerProcedure } from "../ownerProcedure";

export const workspaceRouter = router({
  templates: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(templates).where(eq(templates.ownerId, ctx.user.id)).orderBy(desc(templates.updatedAt));
  }),
  saveTemplate: ownerProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(1).max(255), category: z.string().trim().min(1).max(120), subject: z.string().max(500).nullable().optional(), body: z.string().trim().min(1).max(40_000), isActive: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { id, ...values } = input;
    if (id) {
      await db.update(templates).set(values).where(and(eq(templates.id, id), eq(templates.ownerId, ctx.user.id)));
      return { id };
    }
    const result = await db.insert(templates).values({ ownerId: ctx.user.id, ...values }).$returningId();
    return { id: result[0]?.id };
  }),
  campaigns: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(campaigns).where(eq(campaigns.ownerId, ctx.user.id)).orderBy(desc(campaigns.updatedAt));
  }),
  saveCampaign: ownerProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(1).max(255), channel: z.string().trim().min(1).max(120), sourceCode: z.string().trim().min(1).max(120), status: z.enum(["planned", "active", "paused", "completed"]).default("active"), spendCents: z.number().int().min(0).default(0), startedAt: z.date().nullable().optional(), endedAt: z.date().nullable().optional(), notes: z.string().max(20_000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { id, ...values } = input;
    if (id) {
      await db.update(campaigns).set(values).where(and(eq(campaigns.id, id), eq(campaigns.ownerId, ctx.user.id)));
      return { id };
    }
    const result = await db.insert(campaigns).values({ ownerId: ctx.user.id, ...values }).$returningId();
    return { id: result[0]?.id };
  }),
  reviewSignals: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(reviewSignals).where(eq(reviewSignals.ownerId, ctx.user.id)).orderBy(desc(reviewSignals.signalScore));
  }),
  saveReviewSignal: ownerProcedure.input(z.object({ googlePlaceId: z.string().trim().min(1).max(255), businessName: z.string().trim().min(1).max(255), address: z.string().trim().max(500).nullable().optional(), rating: z.number().min(0).max(5).nullable().optional(), reviewCount: z.number().int().min(0).nullable().optional(), cleaningMentionCount: z.number().int().min(0).default(0), signalScore: z.number().int().min(0).max(100).default(0), keyIssues: z.string().max(20_000).nullable().optional(), rawExcerpt: z.string().max(20_000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.insert(reviewSignals).values({ ownerId: ctx.user.id, ...input }).onDuplicateKeyUpdate({ set: { businessName: input.businessName, address: input.address, rating: input.rating, reviewCount: input.reviewCount, cleaningMentionCount: input.cleaningMentionCount, signalScore: input.signalScore, keyIssues: input.keyIssues, rawExcerpt: input.rawExcerpt, lastCheckedAt: new Date() } });
    return { success: true as const };
  }),
  checklistResponses: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(checklistResponses).where(eq(checklistResponses.ownerId, ctx.user.id)).orderBy(desc(checklistResponses.submittedAt));
  }),
  convertChecklist: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const response = (await db.select().from(checklistResponses).where(and(eq(checklistResponses.id, input.id), eq(checklistResponses.ownerId, ctx.user.id))).limit(1))[0];
    if (!response) throw new TRPCError({ code: "NOT_FOUND", message: "Checklist response not found" });
    if (response.leadId) return { id: response.leadId, existing: true };
    const inserted = await db.insert(leads).values({
      ownerId: ctx.user.id,
      businessName: response.businessName,
      contactName: response.contactName,
      email: response.email,
      phone: response.phone,
      checklistScore: response.score,
      tier: response.tier,
      source: response.campaignSource ? `Psychic Cleaner Checklist · ${response.campaignSource}` : "Psychic Cleaner Checklist",
      stage: "New",
      notes: "Created from a Psychic Cleaner Checklist response.",
    }).$returningId();
    const leadId = inserted[0]?.id;
    if (!leadId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Lead could not be created" });
    await db.update(checklistResponses).set({ leadId }).where(and(eq(checklistResponses.id, input.id), eq(checklistResponses.ownerId, ctx.user.id)));
    await db.insert(leadInteractions).values({ ownerId: ctx.user.id, leadId, type: "system", subject: "Checklist ingested", body: `Psychic Cleaner Checklist score: ${response.score ?? "not supplied"}. Tier: ${response.tier ?? "not supplied"}.` });
    return { id: leadId, existing: false };
  }),
  emailActivity: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(emailActivities).where(eq(emailActivities.ownerId, ctx.user.id)).orderBy(desc(emailActivities.sentAt));
  }),
  logEmail: ownerProcedure.input(z.object({ leadId: z.number().int().positive().nullable().optional(), clientId: z.number().int().positive().nullable().optional(), externalMessageId: z.string().max(255).nullable().optional(), direction: z.enum(["inbound", "outbound"]), fromAddress: z.string().email().max(320).nullable().optional(), toAddress: z.string().email().max(320).nullable().optional(), subject: z.string().max(500).nullable().optional(), snippet: z.string().max(20_000).nullable().optional(), sentAt: z.date() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(emailActivities).values({ ownerId: ctx.user.id, ...input }).$returningId();
    if (input.leadId) {
      await db.insert(leadInteractions).values({ ownerId: ctx.user.id, leadId: input.leadId, type: "email", subject: input.subject || `${input.direction} email`, body: input.snippet || "Email logged without a message preview.", occurredAt: input.sentAt });
    }
    return { id: result[0]?.id };
  }),
  routes: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const allRoutes = await db.select().from(routes).where(eq(routes.ownerId, ctx.user.id)).orderBy(desc(routes.routeDate));
    const stops = await db.select().from(routeStops).where(eq(routeStops.ownerId, ctx.user.id));
    return allRoutes.map(route => ({ ...route, stops: stops.filter(stop => stop.routeId === route.id).sort((a, b) => a.position - b.position) }));
  }),
  saveRoute: ownerProcedure.input(z.object({ name: z.string().trim().min(1).max(255), routeDate: z.date().nullable().optional(), status: z.enum(["draft", "planned", "completed"]).default("draft"), totalDistanceMetres: z.number().int().min(0).default(0), totalDurationSeconds: z.number().int().min(0).default(0), notes: z.string().max(20_000).nullable().optional(), stops: z.array(z.object({ leadId: z.number().int().positive().nullable().optional(), clientId: z.number().int().positive().nullable().optional(), label: z.string().trim().min(1).max(255), address: z.string().trim().min(1).max(500), latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional(), position: z.number().int().min(0), notes: z.string().max(20_000).nullable().optional() })).min(1) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { stops, ...routeValues } = input;
    const inserted = await db.insert(routes).values({ ownerId: ctx.user.id, ...routeValues }).$returningId();
    const routeId = inserted[0]?.id;
    if (!routeId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Route could not be saved" });
    await db.insert(routeStops).values(stops.map(stop => ({ ownerId: ctx.user.id, routeId, ...stop })));
    return { id: routeId };
  }),
});
