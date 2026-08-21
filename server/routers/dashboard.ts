import { ACTIVE_LEAD_STAGES, LEAD_STAGES } from "@shared/crm";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { aiBriefings, clients, invoices, jobs, leads } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { requireDb } from "../db";
import { ownerProcedure } from "../ownerProcedure";

export const dashboardRouter = router({
  summary: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [activeLeadRows, activeClientRows, monthlyRevenueRows, outstandingRows, upcomingJobs, latestBriefing, allLeads] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(leads).where(and(eq(leads.ownerId, ctx.user.id), inArray(leads.stage, ACTIVE_LEAD_STAGES))),
      db.select({ count: sql<number>`count(*)` }).from(clients).where(and(eq(clients.ownerId, ctx.user.id), eq(clients.status, "active"))),
      db.select({ total: sql<number>`coalesce(sum(${invoices.amountCents}), 0)` }).from(invoices).where(and(eq(invoices.ownerId, ctx.user.id), eq(invoices.status, "paid"), gte(invoices.paidAt, monthStart), lt(invoices.paidAt, monthEnd))),
      db.select({ total: sql<number>`coalesce(sum(${invoices.amountCents}), 0)` }).from(invoices).where(and(eq(invoices.ownerId, ctx.user.id), inArray(invoices.status, ["sent", "outstanding", "overdue"]))),
      db.select().from(jobs).where(and(eq(jobs.ownerId, ctx.user.id), eq(jobs.status, "scheduled"), gte(jobs.scheduledStart, now))).orderBy(asc(jobs.scheduledStart)).limit(6),
      db.select().from(aiBriefings).where(eq(aiBriefings.ownerId, ctx.user.id)).orderBy(sql`${aiBriefings.generatedAt} desc`).limit(1),
      db.select({ id: leads.id, businessName: leads.businessName, stage: leads.stage, nextAction: leads.nextAction, nextActionAt: leads.nextActionAt, aiLeadScore: leads.aiLeadScore, checklistScore: leads.checklistScore }).from(leads).where(eq(leads.ownerId, ctx.user.id)),
    ]);
    const stageCounts = Object.fromEntries(LEAD_STAGES.map(stage => [stage, allLeads.filter(lead => lead.stage === stage).length]));
    const priorityLeads = allLeads.filter(lead => ACTIVE_LEAD_STAGES.includes(lead.stage)).sort((a, b) => (b.aiLeadScore ?? b.checklistScore ?? 0) - (a.aiLeadScore ?? a.checklistScore ?? 0)).slice(0, 8);
    return { activeLeads: Number(activeLeadRows[0]?.count ?? 0), activeClients: Number(activeClientRows[0]?.count ?? 0), monthlyRevenueCents: Number(monthlyRevenueRows[0]?.total ?? 0), outstandingInvoiceCents: Number(outstandingRows[0]?.total ?? 0), stageCounts, priorityLeads, upcomingJobs, briefing: latestBriefing[0] ?? null };
  }),
});
