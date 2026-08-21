import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookie } from "cookie";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { automationSettings } from "../../drizzle/schema";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { router } from "../_core/trpc";
import { requireDb } from "../db";
import { ownerProcedure } from "../ownerProcedure";
import { generateMorningBriefing, scoreLead, suggestFollowUp } from "../services/ai";

export const aiRouter = router({
  settings: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const setting = (await db.select().from(automationSettings).where(eq(automationSettings.ownerId, ctx.user.id)).limit(1))[0];
    return setting ?? { ownerId: ctx.user.id, sheetsSyncEnabled: false, sheetsWebhookLastReceivedAt: null, morningBriefingEnabled: false, morningBriefingCronTaskUid: null, lastMorningBriefingAt: null, timezone: "Australia/Perth" };
  }),

  generateBriefing: ownerProcedure.mutation(async ({ ctx }) => generateMorningBriefing(ctx.user.id)),

  scoreLead: ownerProcedure.input(z.object({ leadId: z.number().int().positive() })).mutation(async ({ ctx, input }) => scoreLead(ctx.user.id, input.leadId)),

  suggestFollowUp: ownerProcedure.input(z.object({ leadId: z.number().int().positive() })).mutation(async ({ ctx, input }) => suggestFollowUp(ctx.user.id, input.leadId)),

  setMorningBriefingSchedule: ownerProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const current = (await db.select().from(automationSettings).where(eq(automationSettings.ownerId, ctx.user.id)).limit(1))[0];
    const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    if (!sessionToken) throw new Error("Active owner session is required to manage the schedule");
    let taskUid = current?.morningBriefingCronTaskUid ?? null;
    if (input.enabled) {
      if (taskUid) {
        await updateHeartbeatJob(taskUid, { enable: true }, sessionToken);
      } else {
        const job = await createHeartbeatJob({ name: `bbm-morning-briefing-${ctx.user.id}`, cron: "0 0 22 * * *", path: "/api/scheduled/morning-briefing", description: "Generate the Big Blue Mop morning briefing at 6:00am Perth time" }, sessionToken);
        taskUid = job.taskUid;
      }
    } else if (taskUid) {
      await updateHeartbeatJob(taskUid, { enable: false }, sessionToken);
    }
    await db.insert(automationSettings).values({ ownerId: ctx.user.id, morningBriefingEnabled: input.enabled, morningBriefingCronTaskUid: taskUid, timezone: "Australia/Perth" }).onDuplicateKeyUpdate({ set: { morningBriefingEnabled: input.enabled, morningBriefingCronTaskUid: taskUid, timezone: "Australia/Perth" } });
    return { enabled: input.enabled, taskUid };
  }),
});
