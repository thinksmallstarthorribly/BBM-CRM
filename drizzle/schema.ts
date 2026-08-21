import {
  boolean,
  double,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const leadStageValues = [
  "New",
  "Contacted",
  "Quote Sent",
  "Won",
  "Active Client",
  "Lost",
] as const;

export const leads = mysqlTable(
  "leads",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    businessName: varchar("businessName", { length: 255 }).notNull(),
    contactName: varchar("contactName", { length: 255 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    address: varchar("address", { length: 500 }),
    suburb: varchar("suburb", { length: 120 }),
    businessType: varchar("businessType", { length: 160 }),
    stage: mysqlEnum("stage", leadStageValues).default("New").notNull(),
    checklistScore: int("checklistScore"),
    tier: varchar("tier", { length: 64 }),
    notes: text("notes"),
    source: varchar("source", { length: 160 }).default("Manual").notNull(),
    campaignId: int("campaignId"),
    quoteAmountCents: int("quoteAmountCents"),
    nextAction: varchar("nextAction", { length: 500 }),
    nextActionAt: timestamp("nextActionAt"),
    googlePlaceId: varchar("googlePlaceId", { length: 255 }),
    googleRating: double("googleRating"),
    googleReviewCount: int("googleReviewCount"),
    reviewSignalScore: int("reviewSignalScore"),
    aiLeadScore: int("aiLeadScore"),
    aiScoreReason: text("aiScoreReason"),
    lostReason: text("lostReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("leads_owner_stage_idx").on(table.ownerId, table.stage),
    index("leads_owner_next_action_idx").on(table.ownerId, table.nextActionAt),
    index("leads_campaign_idx").on(table.campaignId),
    uniqueIndex("leads_owner_place_unique").on(table.ownerId, table.googlePlaceId),
  ],
);

export const leadInteractions = mysqlTable(
  "leadInteractions",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    leadId: int("leadId").notNull(),
    type: mysqlEnum("type", ["note", "call", "email", "meeting", "quote", "stage_change", "system"]).notNull(),
    subject: varchar("subject", { length: 255 }),
    body: text("body").notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("lead_interactions_owner_lead_idx").on(table.ownerId, table.leadId),
    index("lead_interactions_occurred_idx").on(table.occurredAt),
  ],
);

export const checklistResponses = mysqlTable(
  "checklistResponses",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    externalId: varchar("externalId", { length: 255 }).notNull(),
    sourceSheet: varchar("sourceSheet", { length: 255 }),
    submittedAt: timestamp("submittedAt").notNull(),
    businessName: varchar("businessName", { length: 255 }).notNull(),
    contactName: varchar("contactName", { length: 255 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    score: int("score"),
    tier: varchar("tier", { length: 64 }),
    campaignSource: varchar("campaignSource", { length: 160 }),
    payload: json("payload"),
    leadId: int("leadId"),
    ingestedAt: timestamp("ingestedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("checklist_owner_external_unique").on(table.ownerId, table.externalId),
    index("checklist_submitted_idx").on(table.submittedAt),
  ],
);

export const clients = mysqlTable(
  "clients",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    leadId: int("leadId"),
    businessName: varchar("businessName", { length: 255 }).notNull(),
    contactName: varchar("contactName", { length: 255 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    billingEmail: varchar("billingEmail", { length: 320 }),
    address: varchar("address", { length: 500 }),
    suburb: varchar("suburb", { length: 120 }),
    abn: varchar("abn", { length: 32 }),
    status: mysqlEnum("status", ["active", "paused", "former"]).default("active").notNull(),
    serviceSummary: text("serviceSummary"),
    notes: text("notes"),
    startedAt: timestamp("startedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("clients_owner_status_idx").on(table.ownerId, table.status),
    uniqueIndex("clients_owner_lead_unique").on(table.ownerId, table.leadId),
  ],
);

export const jobs = mysqlTable(
  "jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    clientId: int("clientId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["scheduled", "completed", "cancelled"]).default("scheduled").notNull(),
    scheduledStart: timestamp("scheduledStart").notNull(),
    scheduledEnd: timestamp("scheduledEnd"),
    completedAt: timestamp("completedAt"),
    revenueCents: int("revenueCents").default(0).notNull(),
    labourCostCents: int("labourCostCents").default(0).notNull(),
    materialCostCents: int("materialCostCents").default(0).notNull(),
    otherCostCents: int("otherCostCents").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("jobs_owner_client_idx").on(table.ownerId, table.clientId),
    index("jobs_owner_schedule_idx").on(table.ownerId, table.scheduledStart),
  ],
);

export const invoices = mysqlTable(
  "invoices",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    clientId: int("clientId").notNull(),
    jobId: int("jobId"),
    invoiceNumber: varchar("invoiceNumber", { length: 80 }).notNull(),
    amountCents: int("amountCents").notNull(),
    status: mysqlEnum("status", ["draft", "sent", "outstanding", "paid", "overdue", "void"]).default("draft").notNull(),
    issuedAt: timestamp("issuedAt"),
    sentAt: timestamp("sentAt"),
    dueAt: timestamp("dueAt"),
    paidAt: timestamp("paidAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("invoices_owner_number_unique").on(table.ownerId, table.invoiceNumber),
    index("invoices_owner_status_idx").on(table.ownerId, table.status),
    index("invoices_client_idx").on(table.clientId),
  ],
);

export const expenses = mysqlTable(
  "expenses",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    clientId: int("clientId"),
    jobId: int("jobId"),
    category: varchar("category", { length: 120 }).notNull(),
    vendor: varchar("vendor", { length: 255 }),
    description: varchar("description", { length: 500 }).notNull(),
    amountCents: int("amountCents").notNull(),
    incurredAt: timestamp("incurredAt").notNull(),
    taxDeductible: boolean("taxDeductible").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("expenses_owner_incurred_idx").on(table.ownerId, table.incurredAt)],
);

export const campaigns = mysqlTable(
  "campaigns",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    channel: varchar("channel", { length: 120 }).notNull(),
    sourceCode: varchar("sourceCode", { length: 120 }).notNull(),
    status: mysqlEnum("status", ["planned", "active", "paused", "completed"]).default("active").notNull(),
    spendCents: int("spendCents").default(0).notNull(),
    startedAt: timestamp("startedAt"),
    endedAt: timestamp("endedAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("campaigns_owner_source_unique").on(table.ownerId, table.sourceCode)],
);

export const emailActivities = mysqlTable(
  "emailActivities",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    leadId: int("leadId"),
    clientId: int("clientId"),
    direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
    externalMessageId: varchar("externalMessageId", { length: 255 }),
    subject: varchar("subject", { length: 500 }),
    snippet: text("snippet"),
    fromAddress: varchar("fromAddress", { length: 320 }),
    toAddress: varchar("toAddress", { length: 320 }),
    sentAt: timestamp("sentAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("email_owner_external_unique").on(table.ownerId, table.externalMessageId),
    index("email_owner_sent_idx").on(table.ownerId, table.sentAt),
  ],
);

export const reviewSignals = mysqlTable(
  "reviewSignals",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    leadId: int("leadId"),
    googlePlaceId: varchar("googlePlaceId", { length: 255 }).notNull(),
    businessName: varchar("businessName", { length: 255 }).notNull(),
    address: varchar("address", { length: 500 }),
    rating: double("rating"),
    reviewCount: int("reviewCount"),
    cleaningMentionCount: int("cleaningMentionCount").default(0).notNull(),
    signalScore: int("signalScore").default(0).notNull(),
    keyIssues: text("keyIssues"),
    rawExcerpt: text("rawExcerpt"),
    lastCheckedAt: timestamp("lastCheckedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("review_owner_place_unique").on(table.ownerId, table.googlePlaceId),
    index("review_owner_score_idx").on(table.ownerId, table.signalScore),
  ],
);

export const templates = mysqlTable(
  "templates",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 120 }).default("Follow-up").notNull(),
    subject: varchar("subject", { length: 500 }),
    body: text("body").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("templates_owner_active_idx").on(table.ownerId, table.isActive)],
);

export const routes = mysqlTable(
  "routes",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    routeDate: timestamp("routeDate"),
    status: mysqlEnum("status", ["draft", "planned", "completed"]).default("draft").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("routes_owner_date_idx").on(table.ownerId, table.routeDate)],
);

export const routeStops = mysqlTable(
  "routeStops",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    routeId: int("routeId").notNull(),
    leadId: int("leadId"),
    clientId: int("clientId"),
    position: int("position").notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    latitude: double("latitude"),
    longitude: double("longitude"),
    plannedMinutes: int("plannedMinutes").default(15).notNull(),
    notes: text("notes"),
  },
  table => [
    uniqueIndex("route_stops_route_position_unique").on(table.routeId, table.position),
    index("route_stops_owner_route_idx").on(table.ownerId, table.routeId),
  ],
);

export const aiBriefings = mysqlTable(
  "aiBriefings",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    briefingDate: timestamp("briefingDate").notNull(),
    summary: text("summary").notNull(),
    priorities: json("priorities"),
    risks: json("risks"),
    opportunities: json("opportunities"),
    model: varchar("model", { length: 120 }),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("briefings_owner_date_unique").on(table.ownerId, table.briefingDate)],
);

export const automationSettings = mysqlTable(
  "automationSettings",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    sheetsSyncEnabled: boolean("sheetsSyncEnabled").default(false).notNull(),
    sheetsWebhookLastReceivedAt: timestamp("sheetsWebhookLastReceivedAt"),
    morningBriefingEnabled: boolean("morningBriefingEnabled").default(false).notNull(),
    morningBriefingCronTaskUid: varchar("morningBriefingCronTaskUid", { length: 65 }),
    lastMorningBriefingAt: timestamp("lastMorningBriefingAt"),
    timezone: varchar("timezone", { length: 80 }).default("Australia/Perth").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("automation_owner_unique").on(table.ownerId),
    index("automation_cron_uid_idx").on(table.morningBriefingCronTaskUid),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
