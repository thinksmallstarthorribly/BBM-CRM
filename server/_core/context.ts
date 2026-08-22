import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateLocalRequest } from "./localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await authenticateLocalRequest(opts.req);
  } catch (error) {
    console.warn("[Auth] Local session check failed:", error);
    user = null;
  }
  if (!user && process.env.OAUTH_SERVER_URL) {
    try {
      const { sdk } = await import("./sdk");
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }
  return { req: opts.req, res: opts.res, user };
}
