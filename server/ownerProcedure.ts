import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { adminProcedure } from "./_core/trpc";

const ALEX_OWNER_EMAIL = "thinksmallstarthorribly@gmail.com";
const ALEX_OWNER_NAME = "alex";

type OwnerIdentity = { openId: string; email: string | null; name: string | null };

export function isConfiguredOwner(user: OwnerIdentity) {
  const email = user.email?.trim().toLowerCase() ?? "";
  const configuredEmail = (ENV.ownerEmail || ALEX_OWNER_EMAIL).trim().toLowerCase();
  if (email && email === configuredEmail) return true;
  if (email === ALEX_OWNER_EMAIL) return true;
  const configuredOpenIdMatches = Boolean(ENV.ownerOpenId && user.openId === ENV.ownerOpenId);
  const verifiedAlexIdentityMatches =
    email === ALEX_OWNER_EMAIL && user.name?.trim().toLowerCase() === ALEX_OWNER_NAME;
  return configuredOpenIdMatches || verifiedAlexIdentityMatches;
}

export const ownerProcedure = adminProcedure.use(async ({ ctx, next }) => {
  if (!isConfiguredOwner(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This CRM is restricted to Alex Cooper." });
  }
  return next({ ctx });
});
