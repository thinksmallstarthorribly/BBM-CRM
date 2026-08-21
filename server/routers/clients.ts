import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { clients, invoices, jobs, leadInteractions, leads } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { requireDb } from "../db";
import { ownerProcedure } from "../ownerProcedure";

const clientFields = z.object({
  businessName: z.string().trim().min(1).max(255),
  contactName: z.string().trim().max(255).nullable().optional(),
  email: z.string().email().max(320).nullable().optional().or(z.literal("")),
  phone: z.string().trim().max(64).nullable().optional(),
  billingEmail: z.string().email().max(320).nullable().optional().or(z.literal("")),
  address: z.string().trim().max(500).nullable().optional(),
  suburb: z.string().trim().max(120).nullable().optional(),
  abn: z.string().trim().max(32).nullable().optional(),
  status: z.enum(["active", "paused", "former"]).default("active"),
  serviceSummary: z.string().max(20_000).nullable().optional(),
  notes: z.string().max(20_000).nullable().optional(),
  startedAt: z.date().nullable().optional(),
});

export const clientsRouter = router({
  list: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(clients).where(eq(clients.ownerId, ctx.user.id)).orderBy(desc(clients.updatedAt));
  }),

  calendar: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db
      .select({
        id: jobs.id,
        clientId: jobs.clientId,
        clientName: clients.businessName,
        title: jobs.title,
        status: jobs.status,
        scheduledStart: jobs.scheduledStart,
        scheduledEnd: jobs.scheduledEnd,
        completedAt: jobs.completedAt,
        revenueCents: jobs.revenueCents,
        labourCostCents: jobs.labourCostCents,
        materialCostCents: jobs.materialCostCents,
        otherCostCents: jobs.otherCostCents,
        notes: jobs.notes,
      })
      .from(jobs)
      .innerJoin(clients, and(eq(clients.id, jobs.clientId), eq(clients.ownerId, ctx.user.id)))
      .where(eq(jobs.ownerId, ctx.user.id))
      .orderBy(desc(jobs.scheduledStart));
  }),

  get: ownerProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const client = (await db.select().from(clients).where(and(eq(clients.id, input.id), eq(clients.ownerId, ctx.user.id))).limit(1))[0];
    if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
    const clientJobs = await db.select().from(jobs).where(and(eq(jobs.ownerId, ctx.user.id), eq(jobs.clientId, input.id))).orderBy(desc(jobs.scheduledStart));
    const clientInvoices = await db.select().from(invoices).where(and(eq(invoices.ownerId, ctx.user.id), eq(invoices.clientId, input.id))).orderBy(desc(invoices.createdAt));
    const sourceLead = client.leadId ? (await db.select({ id: leads.id, businessName: leads.businessName, stage: leads.stage, source: leads.source, checklistScore: leads.checklistScore, tier: leads.tier, notes: leads.notes, createdAt: leads.createdAt }).from(leads).where(and(eq(leads.id, client.leadId), eq(leads.ownerId, ctx.user.id))).limit(1))[0] ?? null : null;
    const sourceTimeline = sourceLead ? await db.select().from(leadInteractions).where(and(eq(leadInteractions.ownerId, ctx.user.id), eq(leadInteractions.leadId, sourceLead.id))).orderBy(desc(leadInteractions.occurredAt)) : [];
    const revenueCents = clientInvoices.filter(item => item.status === "paid").reduce((sum, item) => sum + item.amountCents, 0);
    const outstandingCents = clientInvoices.filter(item => ["sent", "outstanding", "overdue"].includes(item.status)).reduce((sum, item) => sum + item.amountCents, 0);
    const jobCostCents = clientJobs.reduce((sum, item) => sum + item.labourCostCents + item.materialCostCents + item.otherCostCents, 0);
    return { client, jobs: clientJobs, invoices: clientInvoices, leadOrigin: sourceLead ? { lead: sourceLead, timeline: sourceTimeline } : null, financials: { revenueCents, outstandingCents, jobCostCents, marginCents: revenueCents - jobCostCents } };
  }),

  create: ownerProcedure.input(clientFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(clients).values({ ownerId: ctx.user.id, ...input }).$returningId();
    return { id: result[0]?.id };
  }),

  update: ownerProcedure.input(z.object({ id: z.number().int().positive(), changes: clientFields.partial() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.update(clients).set(input.changes).where(and(eq(clients.id, input.id), eq(clients.ownerId, ctx.user.id)));
    return { success: true as const };
  }),

  convertLead: ownerProcedure.input(z.object({ leadId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const lead = (await db.select().from(leads).where(and(eq(leads.id, input.leadId), eq(leads.ownerId, ctx.user.id))).limit(1))[0];
    if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
    const existing = (await db.select({ id: clients.id }).from(clients).where(and(eq(clients.ownerId, ctx.user.id), eq(clients.leadId, input.leadId))).limit(1))[0];
    if (existing) return existing;
    const result = await db.insert(clients).values({ ownerId: ctx.user.id, leadId: lead.id, businessName: lead.businessName, contactName: lead.contactName, email: lead.email, phone: lead.phone, billingEmail: lead.email, address: lead.address, suburb: lead.suburb, notes: lead.notes, startedAt: new Date() }).$returningId();
    await db.update(leads).set({ stage: "Active Client" }).where(and(eq(leads.id, lead.id), eq(leads.ownerId, ctx.user.id)));
    if (lead.stage !== "Active Client") {
      await db.insert(leadInteractions).values({
        ownerId: ctx.user.id,
        leadId: lead.id,
        type: "stage_change",
        subject: "Converted to client",
        body: `${lead.stage} → Active Client`,
      });
    }
    return { id: result[0]?.id };
  }),

  createJob: ownerProcedure.input(z.object({
    clientId: z.number().int().positive(),
    title: z.string().trim().min(1).max(255),
    status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
    scheduledStart: z.date(),
    scheduledEnd: z.date().nullable().optional(),
    completedAt: z.date().nullable().optional(),
    revenueCents: z.number().int().min(0).default(0),
    labourCostCents: z.number().int().min(0).default(0),
    materialCostCents: z.number().int().min(0).default(0),
    otherCostCents: z.number().int().min(0).default(0),
    notes: z.string().max(20_000).nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const client = (await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, input.clientId), eq(clients.ownerId, ctx.user.id))).limit(1))[0];
    if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
    const result = await db.insert(jobs).values({ ownerId: ctx.user.id, ...input }).$returningId();
    return { id: result[0]?.id };
  }),
});
