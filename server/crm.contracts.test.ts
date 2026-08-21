import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { calculateJobMarginCents, calculateProfitCents, buildStageChange, LEAD_STAGES } from "../shared/crm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { deterministicLeadScore, fallbackBriefing } from "./services/ai";
import { checklistDeduplicationKey } from "./services/checklistIngestion";
import { isConfiguredOwner } from "./ownerProcedure";

function nonOwnerContext(): TrpcContext {
  const now = new Date();
  return {
    user: { id: 987, openId: "not-the-owner", name: "Other Admin", email: "other@example.com", loginMethod: "manus", role: "admin", createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("CRM contracts", () => {
  it("enforces the exact lead stage order", () => {
    expect(LEAD_STAGES).toEqual(["New", "Contacted", "Quote Sent", "Won", "Active Client", "Lost"]);
  });

  it("builds auditable pipeline stage mutations", () => {
    expect(buildStageChange("New", "Contacted")).toEqual({ changed: true, body: "New → Contacted" });
    expect(buildStageChange("Won", "Won")).toEqual({ changed: false, body: "Won → Won" });
  });

  it("calculates job margins and operating profit in cents", () => {
    expect(calculateJobMarginCents({ revenueCents: 100_000, labourCostCents: 35_000, materialCostCents: 5_000, otherCostCents: 10_000 })).toBe(50_000);
    expect(calculateProfitCents(250_000, 175_000)).toBe(75_000);
  });

  it("produces stable owner-scoped checklist deduplication keys", () => {
    expect(checklistDeduplicationKey(1, "sheet:42")).toBe(checklistDeduplicationKey(1, " sheet:42 "));
    expect(checklistDeduplicationKey(1, "sheet:42")).not.toBe(checklistDeduplicationKey(2, "sheet:42"));
  });

  it("falls back to deterministic AI outputs without inventing CRM facts", () => {
    expect(deterministicLeadScore({ checklistScore: 80, reviewSignalScore: 60, interactionCount: 4 })).toBe(69);
    const briefing = fallbackBriefing({ activeLeads: 3, outstanding: 2, upcomingJobs: 1, overdue: 1 });
    expect(briefing.summary).toContain("3 active leads");
    expect(briefing.risks[0]).toContain("1 invoices are overdue");
  });

  it("recognises Alex's authentic Manus account by verified email and display name", () => {
    expect(isConfiguredOwner({ openId: "BY83yin2D4LNoyBC4FDNjD", email: "thinksmallstarthorribly@gmail.com", name: "Alex" })).toBe(true);
    expect(isConfiguredOwner({ openId: "unrelated", email: "thinksmallstarthorribly@gmail.com", name: "Alex Cooper" })).toBe(false);
    expect(isConfiguredOwner({ openId: "unrelated", email: "other@example.com", name: "Alex" })).toBe(false);
  });

  it("rejects an authenticated admin who is not the configured owner", async () => {
    const caller = appRouter.createCaller(nonOwnerContext());
    await expect(caller.dashboard.summary()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });
});
