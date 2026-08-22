import {
  boolean,
  doublePrecision,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const leadStageEnum = pgEnum("lead_stage", [
  "New", "Contacted", "Quote Sent", "Won", "Active Client", "Lost",
]);
export const interactionTypeEnum = pgEnum("interaction_type", [
  "note", "call", "email", "meeting", "quote", "stage_change", "system",
]);
export const clientStatusEnum = pgEnum("client_status", ["active", "paused", "former"]);
export const jobStatusEnum = pgEnum("job_status", ["scheduled", "completed", "cancelled"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft", "sent", "outstanding", "paid", "overdue", "void",
]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "planned", "active", "paused", "completed",
]);
export const emailDirectionEnum = pgEnum("email_direction", ["inbound", "outbound"]);
export const routeStatusEnum = pgEnum("route_status", ["draft", "planned", "completed"]);

export const leadStageValues = [
  "New",
  "Contacted",
  "Quote Sent",
  "Won",
  "Active Client",
  "Lost",
] as const;

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const leads = pgTable(
  "leads",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    businessName: varchar("businessName", { length: 255 }).notNull(),
    contactName: varchar("contactName", { length: 255 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    address: varchar("address", { length: 500 }),
    suburb: varchar("suburb", { length: 120 }),
    businessType: varchar("businessType", { length: 160 }),
    stage: leadStageEnum("stage").default("New").notNull(),
    checklistScore: integer("checklistScore"),
    tier: varchar("tier", { length: 64 }),
    notes: text("notes"),
    source: varchar("source", { length: 160 }).default("Manual").notNull(),
    campaignId: integer("campaignId"),
    quoteAmountCents: integer("quoteAmountCents"),
    nextAction: varchar("nextAction", { length: 500 }),
    nextActionAt: timestamp("nextActionAt"),
    googlePlaceId: varchar("googlePlaceId", { length: 255 }),
    googleRating: doublePrecision("googleRating"),
    googleReviewCount: integer("googleReviewCount"),
    reviewSignalScore: integer("reviewSignalScore"),
    aiLeadScore: integer("aiLeadScore"),
    aiScoreReason: text("aiScoreReason"),
    lostReason: text("lostReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  table => [
    index("leads_owner_stage_idx").on(table.ownerId, table.stage),
    index("leads_owner_next_action_idx").on(table.ownerId, table.nextActionAt),
    index("leads_campaign_idx").on(table.campaignId),
    uniqueIndex("leads_owner_place_unique").on(table.ownerId, table.googlePlaceId),
  ],
);

export const leadInteractions = pgTable(
  "leadInteractions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    leadId: integer("leadId").notNull(),
    type: interactionTypeEnum("type").notNull(),
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

export const checklistResponses = pgTable(
  "checklistResponses",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    externalId: varchar("externalId", { length: 255 }).notNull(),
    sourceSheet: varchar("sourceSheet", { length: 255 }),
    submittedAt: timestamp("submittedAt").notNull(),
    businessName: varchar("businessName", { length: 255 }).notNull(),
    contactName: varchar("contactName", { length: 255 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    score: integer("score"),
    tier: varchar("tier", { length: 64 }),
    campaignSource: varchar("campaignSource", { length: 160 }),
    payload: json("payload"),
    leadId: integer("leadId"),
    ingestedAt: timestamp("ingestedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("checklist_owner_external_unique").on(table.ownerId, table.externalId),
    index("checklist_submitted_idx").on(table.submittedAt),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    leadId: integer("leadId"),
    businessName: varchar("businessName", { length: 255 }).notNull(),
    contactName: varchar("contactName", { length: 255 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    billingEmail: varchar("billingEmail", { length: 320 }),
    address: varchar("address", { length: 500 }),
    suburb: varchar("suburb", { length: 120 }),
    abn: varchar("abn", { length: 32 }),
    status: clientStatusEnum("status").default("active").notNull(),
    serviceSummary: text("serviceSummary"),
    notes: text("notes"),
    startedAt: timestamp("startedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  table => [
    index("clients_owner_status_idx").on(table.ownerId, table.status),
    uniqueIndex("clients_owner_lead_unique").on(table.ownerId, table.leadId),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    clientId: integer("clientId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    status: jobStatusEnum("status").default("scheduled").notNull(),
    scheduledStart: timestamp("scheduledStart").notNull(),
    scheduledEnd: timestamp("scheduledEnd"),
    completedAt: timestamp("completedAt"),
    revenueCents: integer("revenueCents").default(0).notNull(),
    labourCostCents: integer("labourCostCents").default(0).notNull(),
    materialCostCents: integer("materialCostCents").default(0).notNull(),
    otherCostCents: integer("otherCostCents").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  table => [
    index("jobs_owner_client_idx").on(table.ownerId, table.clientId),
    index("jobs_owner_schedule_idx").on(table.ownerId, table.scheduledStart),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    clientId: integer("clientId").notNull(),
    jobId: integer("jobId"),
    invoiceNumber: varchar("invoiceNumber", { length: 80 }).notNull(),
    amountCents: integer("amountCents").notNull(),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    issuedAt: timestamp("issuedAt"),
    sentAt: timestamp("sentAt"),
    dueAt: timestamp("dueAt"),
    paidAt: timestamp("paidAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  table => [
    uniqueIndex("invoices_owner_number_unique").on(table.ownerId, table.invoiceNumber),
    index("invoices_owner_status_idx").on(table.ownerId, table.status),
    index("invoices_client_idx").on(table.clientId),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    clientId: integer("clientId"),
    jobId: integer("jobId"),
    category: varchar("category", { length: 120 }).notNull(),
    vendor: varchar("vendor", { length: 255 }),
    description: varchar("description", { length: 500 }).notNull(),
    amountCents: integer("amountCents").notNull(),
    incurredAt: timestamp("incurredAt").notNull(),
    taxDeductible: boolean("taxDeductible").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("expenses_owner_incurred_idx").on(table.ownerId, table.incurredAt)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    channel: varchar("channel", { length: 120 }).notNull(),
    sourceCode: varchar("sourceCode", { length: 120 }).notNull(),
    status: campaignStatusEnum("status").default("active").notNull(),
    spendCents: integer("spendCents").default(0).notNull(),
    startedAt: timestamp("startedAt"),
    endedAt: timestamp("endedAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  table => [uniqueIndex("campaigns_owner_source_unique").on(table.ownerId, table.sourceCode)],
);

export const emailActivities = pgTable(
  "emailActivities",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    leadId: integer("leadId"),
    clientId: integer("clientId"),
    direction: emailDirectionEnum("direction").notNull(),
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

export const reviewSignals = pgTable(
  "reviewSignals",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    leadId: integer("leadId"),
    googlePlaceId: varchar("googlePlaceId", { length: 255 }).notNull(),
    businessName: varchar("businessName", { length: 255 }).notNull(),
    address: varchar("address", { length: 500 }),
    rating: doublePrecision("rating"),
    reviewCount: integer("reviewCount"),
    cleaningMentionCount: integer("cleaningMentionCount").default(0).notNull(),
    signalScore: integer("signalScore").default(0).notNull(),
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

export const templates = pgTable(
  "templates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 120 }).default("Follow-up").notNull(),
    subject: varchar("subject", { length: 500 }),
    body: text("body").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  table => [index("templates_owner_active_idx").on(table.ownerId, table.isActive)],
);

export const routes = pgTable(
  "routes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    routeDate: timestamp("routeDate"),
    status: routeStatusEnum("status").default("draft").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  table => [index("routes_owner_date_idx").on(table.ownerId, table.routeDate)],
);

export const routeStops = pgTable(
  "routeStops",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    routeId: integer("routeId").notNull(),
    leadId: integer("leadId"),
    clientId: integer("clientId"),
    position: integer("position").notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    plannedMinutes: integer("plannedMinutes").default(15).notNull(),
    notes: text("notes"),
  },
  table => [
    uniqueIndex("route_stops_route_position_unique").on(table.routeId, table.position),
    index("route_stops_owner_route_idx").on(table.ownerId, table.routeId),
  ],
);

export const aiBriefings = pgTable(
  "aiBriefings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
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

export const automationSettings = pgTable(
  "automationSettings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("ownerId").notNull(),
    sheetsSyncEnabled: boolean("sheetsSyncEnabled").default(false).notNull(),
    sheetsWebhookLastReceivedAt: timestamp("sheetsWebhookLastReceivedAt"),
    morningBriefingEnabled: boolean("morningBriefingEnabled").default(false).notNull(),
    morningBriefingCronTaskUid: varchar("morningBriefingCronTaskUid", { length: 65 }),
    lastMorningBriefingAt: timestamp("lastMorningBriefingAt"),
    timezone: varchar("timezone", { length: 80 }).default("Australia/Perth").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
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
