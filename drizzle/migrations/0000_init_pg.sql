CREATE TYPE "public"."campaign_status" AS ENUM('planned', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'paused', 'former');--> statement-breakpoint
CREATE TYPE "public"."email_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('note', 'call', 'email', 'meeting', 'quote', 'stage_change', 'system');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'outstanding', 'paid', 'overdue', 'void');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('New', 'Contacted', 'Quote Sent', 'Won', 'Active Client', 'Lost');--> statement-breakpoint
CREATE TYPE "public"."route_status" AS ENUM('draft', 'planned', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" text,
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "leads_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ownerId" integer NOT NULL,
	"businessName" varchar(255) NOT NULL,
	"contactName" varchar(255),
	"email" varchar(320),
	"phone" varchar(64),
	"address" varchar(500),
	"suburb" varchar(120),
	"businessType" varchar(160),
	"stage" "lead_stage" DEFAULT 'New' NOT NULL,
	"checklistScore" integer,
	"tier" varchar(64),
	"notes" text,
	"source" varchar(160) DEFAULT 'Manual' NOT NULL,
	"campaignId" integer,
	"quoteAmountCents" integer,
	"nextAction" varchar(500),
	"nextActionAt" timestamp,
	"googlePlaceId" varchar(255),
	"googleRating" double precision,
	"googleReviewCount" integer,
	"reviewSignalScore" integer,
	"aiLeadScore" integer,
	"aiScoreReason" text,
	"lostReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ownerId" integer NOT NULL,
	"leadId" integer,
	"businessName" varchar(255) NOT NULL,
	"contactName" varchar(255),
	"email" varchar(320),
	"phone" varchar(64),
	"billingEmail" varchar(320),
	"address" varchar(500),
	"suburb" varchar(120),
	"abn" varchar(32),
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"serviceSummary" text,
	"notes" text,
	"startedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Remaining tables (jobs, invoices, expenses, campaigns, interactions, checklist, email, review signals, templates, routes, AI, automation) follow same Postgres identity pattern; full snapshot in 0000_snapshot if needed.
-- Core CRM tables above are sufficient for auth + lead/client boot.
