CREATE TABLE `aiBriefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`briefingDate` timestamp NOT NULL,
	`summary` text NOT NULL,
	`priorities` json,
	`risks` json,
	`opportunities` json,
	`model` varchar(120),
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiBriefings_id` PRIMARY KEY(`id`),
	CONSTRAINT `briefings_owner_date_unique` UNIQUE(`ownerId`,`briefingDate`)
);
--> statement-breakpoint
CREATE TABLE `automationSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`sheetsSyncEnabled` boolean NOT NULL DEFAULT false,
	`sheetsWebhookLastReceivedAt` timestamp,
	`morningBriefingEnabled` boolean NOT NULL DEFAULT false,
	`morningBriefingCronTaskUid` varchar(65),
	`lastMorningBriefingAt` timestamp,
	`timezone` varchar(80) NOT NULL DEFAULT 'Australia/Perth',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automationSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_owner_unique` UNIQUE(`ownerId`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`channel` varchar(120) NOT NULL,
	`sourceCode` varchar(120) NOT NULL,
	`status` enum('planned','active','paused','completed') NOT NULL DEFAULT 'active',
	`spendCents` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaigns_owner_source_unique` UNIQUE(`ownerId`,`sourceCode`)
);
--> statement-breakpoint
CREATE TABLE `checklistResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`sourceSheet` varchar(255),
	`submittedAt` timestamp NOT NULL,
	`businessName` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`email` varchar(320),
	`phone` varchar(64),
	`score` int,
	`tier` varchar(64),
	`campaignSource` varchar(160),
	`payload` json,
	`leadId` int,
	`ingestedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklistResponses_id` PRIMARY KEY(`id`),
	CONSTRAINT `checklist_owner_external_unique` UNIQUE(`ownerId`,`externalId`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`leadId` int,
	`businessName` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`email` varchar(320),
	`phone` varchar(64),
	`billingEmail` varchar(320),
	`address` varchar(500),
	`suburb` varchar(120),
	`abn` varchar(32),
	`status` enum('active','paused','former') NOT NULL DEFAULT 'active',
	`serviceSummary` text,
	`notes` text,
	`startedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_owner_lead_unique` UNIQUE(`ownerId`,`leadId`)
);
--> statement-breakpoint
CREATE TABLE `emailActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`leadId` int,
	`clientId` int,
	`direction` enum('inbound','outbound') NOT NULL,
	`externalMessageId` varchar(255),
	`subject` varchar(500),
	`snippet` text,
	`fromAddress` varchar(320),
	`toAddress` varchar(320),
	`sentAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailActivities_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_owner_external_unique` UNIQUE(`ownerId`,`externalMessageId`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`clientId` int,
	`jobId` int,
	`category` varchar(120) NOT NULL,
	`vendor` varchar(255),
	`description` varchar(500) NOT NULL,
	`amountCents` int NOT NULL,
	`incurredAt` timestamp NOT NULL,
	`taxDeductible` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`clientId` int NOT NULL,
	`jobId` int,
	`invoiceNumber` varchar(80) NOT NULL,
	`amountCents` int NOT NULL,
	`status` enum('draft','sent','outstanding','paid','overdue','void') NOT NULL DEFAULT 'draft',
	`issuedAt` timestamp,
	`sentAt` timestamp,
	`dueAt` timestamp,
	`paidAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_owner_number_unique` UNIQUE(`ownerId`,`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`clientId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`scheduledStart` timestamp NOT NULL,
	`scheduledEnd` timestamp,
	`completedAt` timestamp,
	`revenueCents` int NOT NULL DEFAULT 0,
	`labourCostCents` int NOT NULL DEFAULT 0,
	`materialCostCents` int NOT NULL DEFAULT 0,
	`otherCostCents` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leadInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`leadId` int NOT NULL,
	`type` enum('note','call','email','meeting','quote','stage_change','system') NOT NULL,
	`subject` varchar(255),
	`body` text NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leadInteractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`businessName` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`email` varchar(320),
	`phone` varchar(64),
	`address` varchar(500),
	`suburb` varchar(120),
	`businessType` varchar(160),
	`stage` enum('New','Contacted','Quote Sent','Won','Active Client','Lost') NOT NULL DEFAULT 'New',
	`checklistScore` int,
	`tier` varchar(64),
	`notes` text,
	`source` varchar(160) NOT NULL DEFAULT 'Manual',
	`campaignId` int,
	`quoteAmountCents` int,
	`nextAction` varchar(500),
	`nextActionAt` timestamp,
	`googlePlaceId` varchar(255),
	`googleRating` double,
	`googleReviewCount` int,
	`reviewSignalScore` int,
	`aiLeadScore` int,
	`aiScoreReason` text,
	`lostReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `leads_owner_place_unique` UNIQUE(`ownerId`,`googlePlaceId`)
);
--> statement-breakpoint
CREATE TABLE `reviewSignals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`leadId` int,
	`googlePlaceId` varchar(255) NOT NULL,
	`businessName` varchar(255) NOT NULL,
	`address` varchar(500),
	`rating` double,
	`reviewCount` int,
	`cleaningMentionCount` int NOT NULL DEFAULT 0,
	`signalScore` int NOT NULL DEFAULT 0,
	`keyIssues` text,
	`rawExcerpt` text,
	`lastCheckedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewSignals_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_owner_place_unique` UNIQUE(`ownerId`,`googlePlaceId`)
);
--> statement-breakpoint
CREATE TABLE `routeStops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`routeId` int NOT NULL,
	`leadId` int,
	`clientId` int,
	`position` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`address` varchar(500) NOT NULL,
	`latitude` double,
	`longitude` double,
	`plannedMinutes` int NOT NULL DEFAULT 15,
	`notes` text,
	CONSTRAINT `routeStops_id` PRIMARY KEY(`id`),
	CONSTRAINT `route_stops_route_position_unique` UNIQUE(`routeId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`routeDate` timestamp,
	`status` enum('draft','planned','completed') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(120) NOT NULL DEFAULT 'Follow-up',
	`subject` varchar(500),
	`body` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `automation_cron_uid_idx` ON `automationSettings` (`morningBriefingCronTaskUid`);--> statement-breakpoint
CREATE INDEX `checklist_submitted_idx` ON `checklistResponses` (`submittedAt`);--> statement-breakpoint
CREATE INDEX `clients_owner_status_idx` ON `clients` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `email_owner_sent_idx` ON `emailActivities` (`ownerId`,`sentAt`);--> statement-breakpoint
CREATE INDEX `expenses_owner_incurred_idx` ON `expenses` (`ownerId`,`incurredAt`);--> statement-breakpoint
CREATE INDEX `invoices_owner_status_idx` ON `invoices` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `invoices_client_idx` ON `invoices` (`clientId`);--> statement-breakpoint
CREATE INDEX `jobs_owner_client_idx` ON `jobs` (`ownerId`,`clientId`);--> statement-breakpoint
CREATE INDEX `jobs_owner_schedule_idx` ON `jobs` (`ownerId`,`scheduledStart`);--> statement-breakpoint
CREATE INDEX `lead_interactions_owner_lead_idx` ON `leadInteractions` (`ownerId`,`leadId`);--> statement-breakpoint
CREATE INDEX `lead_interactions_occurred_idx` ON `leadInteractions` (`occurredAt`);--> statement-breakpoint
CREATE INDEX `leads_owner_stage_idx` ON `leads` (`ownerId`,`stage`);--> statement-breakpoint
CREATE INDEX `leads_owner_next_action_idx` ON `leads` (`ownerId`,`nextActionAt`);--> statement-breakpoint
CREATE INDEX `leads_campaign_idx` ON `leads` (`campaignId`);--> statement-breakpoint
CREATE INDEX `review_owner_score_idx` ON `reviewSignals` (`ownerId`,`signalScore`);--> statement-breakpoint
CREATE INDEX `route_stops_owner_route_idx` ON `routeStops` (`ownerId`,`routeId`);--> statement-breakpoint
CREATE INDEX `routes_owner_date_idx` ON `routes` (`ownerId`,`routeDate`);--> statement-breakpoint
CREATE INDEX `templates_owner_active_idx` ON `templates` (`ownerId`,`isActive`);