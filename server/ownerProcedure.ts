import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { adminProcedure } from "./_core/trpc";

const ALEX_OWNER_EMAIL = "thinksmallstarthorribly@gmail.com";
const ALEX_OWNER_NAME = "alex";

type OwnerIdentity = { openId: string; email: string | null; name: string | null };

export function isConfiguredOwner(user: OwnerIdentity) {
  const configuredOpenIdMatches = Boolean(ENV.ownerOpenId && user.openId === ENV.ownerOpenId);
  const verifiedAlexIdentityMatches = user.email?.trim().toLowerCase() === ALEX_OWNER_EMAIL && user.name?.trim().toLowerCase() === ALEX_OWNER_NAME;
  return configuredOpenIdMatches || verifiedAlexIdentityMatches;
}

/**
 * Every CRM operation is restricted to the project owner identity, even if a
 * second account is accidentally promoted to the generic admin role.
 */
export const ownerProcedure = adminProcedure.use(async ({ ctx, next }) => {
  if (!isConfiguredOwner(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This CRM is restricted to Alex Cooper." });
  }

  return next({ ctx });
});
