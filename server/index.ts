import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { GmailSyncService } from './services/emailSyncService'; // Ensure this path is correct

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Initialize Gmail Sync Service
  let gmailSyncService: GmailSyncService | null = null;
  
  if (app.get("env") !== "test") {
    const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    const AI_SUMMARY_ENABLED = true; // Or from env var

    if (process.env.GOOGLE_CLIENT_ID && process.env.SYNC_TARGET_EMAIL_ADDRESS) {
      gmailSyncService = new GmailSyncService(SYNC_INTERVAL_MS, AI_SUMMARY_ENABLED);
      // The service will try to use stored tokens. If none, it won't start polling effectively.
      // Admin needs to visit /api/auth/google/initiate once to authorize.
      gmailSyncService.start();
      console.log("Gmail Sync Service configured. It will start polling if authorized.");
      
      // Make the service instance accessible to routes
      app.set('gmailSyncService', gmailSyncService);
    } else {
      console.warn("Gmail Sync Service: Google Client ID or Sync Target Email missing in env. Service not started.");
      console.log("To authorize, ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and SYNC_TARGET_EMAIL_ADDRESS are set, then have an admin visit: /api/auth/google/initiate");
    }
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
