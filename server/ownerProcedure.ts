import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { adminProcedure } from "./_core/trpc";

/**
 * Every CRM operation is restricted to the project owner identity, even if a
 * second account is accidentally promoted to the generic admin role.
 */
export const ownerProcedure = adminProcedure.use(async ({ ctx, next }) => {
  if (!ENV.ownerOpenId || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This CRM is restricted to Alex Cooper." });
  }

  return next({ ctx });
});
