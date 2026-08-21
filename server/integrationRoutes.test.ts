import crypto from "crypto";
import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerIntegrationRoutes } from "./integrationRoutes";

describe("signed checklist integration health", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    expect(process.env.BBM_CHECKLIST_WEBHOOK_SECRET?.length).toBeGreaterThanOrEqual(32);
    const app = express();
    app.use(express.json());
    registerIntegrationRoutes(app);
    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  it("accepts a health request signed with the configured secret", async () => {
    const body = { ping: true };
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto.createHmac("sha256", process.env.BBM_CHECKLIST_WEBHOOK_SECRET!).update(`${timestamp}.${JSON.stringify(body)}`).digest("hex");
    const response = await fetch(`${baseUrl}/api/integrations/checklist/health`, { method: "POST", headers: { "content-type": "application/json", "x-bbm-timestamp": timestamp, "x-bbm-signature": signature }, body: JSON.stringify(body) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, integration: "psychic-cleaner-checklist" });
  });

  it("rejects an invalid signature", async () => {
    const response = await fetch(`${baseUrl}/api/integrations/checklist/health`, { method: "POST", headers: { "content-type": "application/json", "x-bbm-timestamp": Math.floor(Date.now() / 1000).toString(), "x-bbm-signature": "00".repeat(32) }, body: JSON.stringify({ ping: true }) });
    expect(response.status).toBe(401);
  });
});
