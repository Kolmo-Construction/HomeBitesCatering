import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Gmail sync service has been retired in favor of more specialized services
import { LeadGenerationService } from './services/leadGenerationService';
import { CommunicationSyncService } from './services/communicationSyncService';
import { VendorLeadIntakeService } from './services/VendorLeadIntakeService'; // Import for Gmail watch

// Initialize service instances
const leadGenerationService = new LeadGenerationService();
const communicationSyncService = new CommunicationSyncService();
const vendorLeadIntakeService = new VendorLeadIntakeService();

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

  // Initialize Email Services
  let leadGenService: LeadGenerationService | null = null;
  let commSyncService: CommunicationSyncService | null = null;
  
  if (app.get("env") !== "test") {
    // Service configuration - could be moved to environment variables
    const LEAD_GEN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    const COMM_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
    const AI_ENABLED = true; // Or from env var

    if (process.env.GOOGLE_CLIENT_ID && process.env.SYNC_TARGET_EMAIL_ADDRESS) {
      // Initialize specialized services but don't start them
      leadGenService = new LeadGenerationService(LEAD_GEN_INTERVAL_MS, AI_ENABLED);
      commSyncService = new CommunicationSyncService(COMM_SYNC_INTERVAL_MS, AI_ENABLED);
      
      // Services will NOT start automatically - must be started manually via toggle
      // Admin needs to visit /api/auth/google/initiate once to authorize.
      console.log("Email services configured but NOT started. Email sync is OFF by default.");
      
      // Make the service instances accessible to routes
      app.set('leadGenService', leadGenService);
      app.set('commSyncService', commSyncService);
      
      // Set up VendorLeadIntakeService with Gmail watch if GOOGLE_CLOUD_PROJECT_ID is available
      if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        // Initialize and start the Gmail watch
        // Ensure OAuth is ready before calling this. The service's initializeGmailClient handles it.
        try {
          await vendorLeadIntakeService.startOrRenewWatch(); // Initial watch setup
          // Set up a periodic renewal (e.g., every day or every few days)
          setInterval(() => {
            vendorLeadIntakeService.ensureWatchIsActive().catch(err => 
              console.error("Error during periodic watch renewal:", err));
          }, 24 * 60 * 60 * 1000); // Check daily
          console.log("VendorLeadIntakeService watch initiated and renewal scheduled.");
        } catch (e) {
          console.error("Failed to start initial Gmail watch:", e);
        }

        app.set('vendorLeadIntakeService', vendorLeadIntakeService); // If routes need direct access
      } else {
        console.warn("Gmail Pub/Sub Lead Intake: Missing GOOGLE_CLOUD_PROJECT_ID in env. Pub/Sub watch not started.");
      }
    } else {
      console.warn("Email Services: Google Client ID or Sync Target Email missing in env. Services not started.");
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
