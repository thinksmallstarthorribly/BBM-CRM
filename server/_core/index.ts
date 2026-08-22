import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerIntegrationRoutes } from "../integrationRoutes";
import { registerScheduledRoutes } from "../scheduledRoutes";
import {
  clearSessionCookie,
  ensureOwnerFromEnv,
  loginWithPassword,
  setSessionCookie,
} from "./localAuth";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "bbm-crm",
      time: new Date().toISOString(),
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      res.status(400).json({ ok: false, error: "Email and password are required" });
      return;
    }
    try {
      const result = await loginWithPassword(email, password);
      if ("error" in result) {
        res.status(401).json({ ok: false, error: result.error });
        return;
      }
      setSessionCookie(req, res, result.token);
      res.json({
        ok: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ ok: false, error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  if (process.env.OAUTH_SERVER_URL) {
    try {
      const { registerOAuthRoutes } = await import("./oauth");
      registerOAuthRoutes(app);
    } catch (e) {
      console.warn("[Boot] OAuth routes skipped", e);
    }
  }
  if (process.env.BUILT_IN_FORGE_API_URL) {
    try {
      const { registerStorageProxy } = await import("./storageProxy");
      registerStorageProxy(app);
    } catch (e) {
      console.warn("[Boot] Storage proxy skipped", e);
    }
  }

  registerIntegrationRoutes(app);
  registerScheduledRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  ensureOwnerFromEnv().catch(err =>
    console.warn("[Auth] Owner seed on boot skipped:", err)
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
