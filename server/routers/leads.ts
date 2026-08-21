import { buildStageChange, LEAD_STAGES } from "@shared/crm";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { leadInteractions, leads } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { requireDb } from "../db";
import { ownerProcedure } from "../ownerProcedure";

const stageSchema = z.enum(LEAD_STAGES);
const nullableDate = z.date().nullable().optional();

const leadFields = z.object({
  businessName: z.string().trim().min(1).max(255),
  contactName: z.string().trim().max(255).nullable().optional(),
  email: z.string().email().max(320).nullable().optional().or(z.literal("")),
  phone: z.string().trim().max(64).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  suburb: z.string().trim().max(120).nullable().optional(),
  businessType: z.string().trim().max(160).nullable().optional(),
  stage: stageSchema.default("New"),
  checklistScore: z.number().int().min(0).max(100).nullable().optional(),
  tier: z.string().trim().max(64).nullable().optional(),
  notes: z.string().max(20_000).nullable().optional(),
  source: z.string().trim().max(160).default("Manual"),
  campaignId: z.number().int().positive().nullable().optional(),
  quoteAmountCents: z.number().int().min(0).nullable().optional(),
  nextAction: z.string().trim().max(500).nullable().optional(),
  nextActionAt: nullableDate,
  googlePlaceId: z.string().trim().max(255).nullable().optional(),
  googleRating: z.number().min(0).max(5).nullable().optional(),
  googleReviewCount: z.number().int().min(0).nullable().optional(),
});

export const leadsRouter = router({
  list: ownerProcedure
    .input(z.object({ search: z.string().max(200).optional(), stage: stageSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const search = input?.search?.trim();
      return db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.ownerId, ctx.user.id),
            input?.stage ? eq(leads.stage, input.stage) : undefined,
            search
              ? or(
                  like(leads.businessName, `%${search}%`),
                  like(leads.contactName, `%${search}%`),
                  like(leads.email, `%${search}%`),
                  like(leads.suburb, `%${search}%`),
                )
              : undefined,
          ),
        )
        .orderBy(desc(leads.updatedAt));
    }),

  timeline: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db
      .select({
        id: leadInteractions.id,
        leadId: leadInteractions.leadId,
        businessName: leads.businessName,
        type: leadInteractions.type,
        subject: leadInteractions.subject,
        body: leadInteractions.body,
        occurredAt: leadInteractions.occurredAt,
      })
      .from(leadInteractions)
      .innerJoin(leads, and(eq(leads.id, leadInteractions.leadId), eq(leads.ownerId, ctx.user.id)))
      .where(eq(leadInteractions.ownerId, ctx.user.id))
      .orderBy(desc(leadInteractions.occurredAt));
  }),

  get: ownerProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const lead = (
      await db.select().from(leads).where(and(eq(leads.id, input.id), eq(leads.ownerId, ctx.user.id))).limit(1)
    )[0];
    if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
    const timeline = await db
      .select()
      .from(leadInteractions)
      .where(and(eq(leadInteractions.ownerId, ctx.user.id), eq(leadInteractions.leadId, input.id)))
      .orderBy(desc(leadInteractions.occurredAt));
    return { lead, timeline };
  }),

  create: ownerProcedure.input(leadFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(leads).values({ ...input, ownerId: ctx.user.id }).$returningId();
    const id = result[0]?.id;
    if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Lead could not be created" });
    await db.insert(leadInteractions).values({
      ownerId: ctx.user.id,
      leadId: id,
      type: "system",
      subject: "Lead created",
      body: `${input.businessName} entered the pipeline at ${input.stage}.`,
    });
    return { id };
  }),

  update: ownerProcedure
    .input(z.object({ id: z.number().int().positive(), changes: leadFields.partial() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db
        .update(leads)
        .set(input.changes)
        .where(and(eq(leads.id, input.id), eq(leads.ownerId, ctx.user.id)));
      return { success: true as const };
    }),

  moveStage: ownerProcedure
    .input(z.object({ id: z.number().int().positive(), stage: stageSchema }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const current = (
        await db.select({ stage: leads.stage }).from(leads).where(and(eq(leads.id, input.id), eq(leads.ownerId, ctx.user.id))).limit(1)
      )[0];
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      await db.update(leads).set({ stage: input.stage }).where(and(eq(leads.id, input.id), eq(leads.ownerId, ctx.user.id)));
      const change = buildStageChange(current.stage, input.stage);
      if (change.changed) {
        await db.insert(leadInteractions).values({
          ownerId: ctx.user.id,
          leadId: input.id,
          type: "stage_change",
          subject: "Pipeline stage changed",
          body: change.body,
        });
      }
      return { success: true as const };
    }),

  addInteraction: ownerProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        type: z.enum(["note", "call", "email", "meeting", "quote", "system"]),
        subject: z.string().max(255).nullable().optional(),
        body: z.string().trim().min(1).max(20_000),
        occurredAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const lead = (
        await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, input.leadId), eq(leads.ownerId, ctx.user.id))).limit(1)
      )[0];
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      await db.insert(leadInteractions).values({ ownerId: ctx.user.id, ...input });
      return { success: true as const };
    }),
});
