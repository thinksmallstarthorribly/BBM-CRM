import { calculateProfitCents } from "@shared/crm";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { clients, expenses, invoices } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import { requireDb } from "../db";
import { ownerProcedure } from "../ownerProcedure";

function periodStart(period: "month" | "quarter" | "year") {
  const now = new Date();
  if (period === "year") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  if (period === "quarter") return new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export const financeRouter = router({
  overview: ownerProcedure.input(z.object({ period: z.enum(["month", "quarter", "year"]).default("month") }).optional()).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const start = periodStart(input?.period ?? "month");
    const end = new Date();
    const paid = await db.select({ total: sql<number>`coalesce(sum(${invoices.amountCents}), 0)` }).from(invoices).where(and(eq(invoices.ownerId, ctx.user.id), eq(invoices.status, "paid"), gte(invoices.paidAt, start), lt(invoices.paidAt, end)));
    const spent = await db.select({ total: sql<number>`coalesce(sum(${expenses.amountCents}), 0)` }).from(expenses).where(and(eq(expenses.ownerId, ctx.user.id), gte(expenses.incurredAt, start), lt(expenses.incurredAt, end)));
    const outstanding = await db.select().from(invoices).where(and(eq(invoices.ownerId, ctx.user.id), inArray(invoices.status, ["sent", "outstanding", "overdue"]))).orderBy(desc(invoices.dueAt));
    const revenueCents = Number(paid[0]?.total ?? 0);
    const expenseCents = Number(spent[0]?.total ?? 0);
    return { period: input?.period ?? "month", start, end, revenueCents, expenseCents, profitCents: calculateProfitCents(revenueCents, expenseCents), outstandingCents: outstanding.reduce((sum, item) => sum + item.amountCents, 0), outstanding };
  }),

  trend: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const [paidInvoices, expenseRows] = await Promise.all([
      db.select({ amountCents: invoices.amountCents, paidAt: invoices.paidAt }).from(invoices).where(and(eq(invoices.ownerId, ctx.user.id), eq(invoices.status, "paid"), gte(invoices.paidAt, start))),
      db.select({ amountCents: expenses.amountCents, incurredAt: expenses.incurredAt }).from(expenses).where(and(eq(expenses.ownerId, ctx.user.id), gte(expenses.incurredAt, start))),
    ]);
    return Array.from({ length: 12 }, (_, offset) => {
      const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const inMonth = (value: Date | null) => value ? `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}` === key : false;
      const revenueCents = paidInvoices.filter(item => inMonth(item.paidAt)).reduce((sum, item) => sum + item.amountCents, 0);
      const expenseCents = expenseRows.filter(item => inMonth(item.incurredAt)).reduce((sum, item) => sum + item.amountCents, 0);
      return { key, label: date.toLocaleString("en-AU", { month: "short", timeZone: "UTC" }), revenueCents, expenseCents, profitCents: calculateProfitCents(revenueCents, expenseCents) };
    });
  }),

  listInvoices: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select({
      id: invoices.id,
      clientId: invoices.clientId,
      clientName: clients.businessName,
      jobId: invoices.jobId,
      invoiceNumber: invoices.invoiceNumber,
      amountCents: invoices.amountCents,
      status: invoices.status,
      issuedAt: invoices.issuedAt,
      sentAt: invoices.sentAt,
      dueAt: invoices.dueAt,
      paidAt: invoices.paidAt,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    }).from(invoices).innerJoin(clients, and(eq(clients.id, invoices.clientId), eq(clients.ownerId, ctx.user.id))).where(eq(invoices.ownerId, ctx.user.id)).orderBy(desc(invoices.createdAt));
  }),

  createInvoice: ownerProcedure.input(z.object({ clientId: z.number().int().positive(), jobId: z.number().int().positive().nullable().optional(), invoiceNumber: z.string().trim().min(1).max(80), amountCents: z.number().int().positive(), status: z.enum(["draft", "sent", "outstanding", "paid", "overdue", "void"]).default("draft"), issuedAt: z.date().nullable().optional(), sentAt: z.date().nullable().optional(), dueAt: z.date().nullable().optional(), paidAt: z.date().nullable().optional(), notes: z.string().max(20_000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const client = (await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, input.clientId), eq(clients.ownerId, ctx.user.id))).limit(1))[0];
    if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
    const result = await db.insert(invoices).values({ ownerId: ctx.user.id, ...input }).$returningId();
    return { id: result[0]?.id };
  }),

  updateInvoiceStatus: ownerProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "sent", "outstanding", "paid", "overdue", "void"]) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.update(invoices).set({ status: input.status, paidAt: input.status === "paid" ? new Date() : undefined }).where(and(eq(invoices.id, input.id), eq(invoices.ownerId, ctx.user.id)));
    return { success: true as const };
  }),

  listExpenses: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select({
      id: expenses.id,
      clientId: expenses.clientId,
      clientName: clients.businessName,
      jobId: expenses.jobId,
      category: expenses.category,
      vendor: expenses.vendor,
      description: expenses.description,
      amountCents: expenses.amountCents,
      incurredAt: expenses.incurredAt,
      taxDeductible: expenses.taxDeductible,
      notes: expenses.notes,
      createdAt: expenses.createdAt,
    }).from(expenses).leftJoin(clients, and(eq(clients.id, expenses.clientId), eq(clients.ownerId, ctx.user.id))).where(eq(expenses.ownerId, ctx.user.id)).orderBy(desc(expenses.incurredAt));
  }),

  createExpense: ownerProcedure.input(z.object({ clientId: z.number().int().positive().nullable().optional(), jobId: z.number().int().positive().nullable().optional(), category: z.string().trim().min(1).max(120), vendor: z.string().trim().max(255).nullable().optional(), description: z.string().trim().min(1).max(500), amountCents: z.number().int().positive(), incurredAt: z.date(), taxDeductible: z.boolean().default(true), notes: z.string().max(20_000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(expenses).values({ ownerId: ctx.user.id, ...input }).$returningId();
    return { id: result[0]?.id };
  }),
});
