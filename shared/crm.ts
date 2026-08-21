export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Quote Sent",
  "Won",
  "Active Client",
  "Lost",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const ACTIVE_LEAD_STAGES: LeadStage[] = ["New", "Contacted", "Quote Sent", "Won"];

export const OUTSTANDING_INVOICE_STATUSES = ["sent", "outstanding", "overdue"] as const;

export function calculateJobMarginCents(input: {
  revenueCents: number;
  labourCostCents: number;
  materialCostCents: number;
  otherCostCents: number;
}) {
  return input.revenueCents - input.labourCostCents - input.materialCostCents - input.otherCostCents;
}

export function calculateProfitCents(revenueCents: number, expenseCents: number) {
  return revenueCents - expenseCents;
}

export function buildStageChange(from: LeadStage, to: LeadStage) {
  return { changed: from !== to, body: `${from} → ${to}` };
}
