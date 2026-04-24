import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import ingredientRoutes from "./ingredientRoutes";
import quoteRoutes, { inquiryRouter } from "./quoteRoutes";
import chatAgentRouter from "./chatAgentRoutes";
import catalogRouter from "./catalogRoutes";
import socialRouter from "./socialRoutes";
import {
  getWeddingMenuThemes,
  getMenuItemsByCategory,
  getMenuItemsByIds,
  getDietaryRecommendations
} from "./menuQuestionnaireRoutes";
import { setupVite, serveStatic, log } from "./vite";
import { registerScheduledJobs } from "./jobs/scheduler";
import { registerSeoRoutes } from "./seoRoutes";

const app = express();
// Capture raw body for webhook signature verification (Cal.com, Stripe, etc.).
// `verify` is called before JSON parsing so we can store the untouched bytes.
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
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

  // Register ingredient management routes
  app.use('/api/ingredients', ingredientRoutes);

  // Register quote-related routes (menus, venues, promo codes)
  app.use('/api/quotes', quoteRoutes);

  // Inquiry routes — mounted separately at /api/inquiries
  app.use('/api/inquiries', inquiryRouter);

  // Kitchen chat agent (DeepSeek-powered floating widget for chefs)
  app.use('/api/chat-agent', chatAgentRouter);

  // Catalog (appetizers / desserts / equipment / pricing config)
  app.use('/api/catalog', catalogRouter);

  // Social publishing (Buffer-backed: Instagram + Facebook)
  app.use('/api/social', socialRouter);
  
  // Register menu questionnaire routes for rich menu data integration
  app.get('/api/questionnaire/wedding-menu-themes', getWeddingMenuThemes);
  app.get('/api/questionnaire/menu-items', getMenuItemsByCategory);
  app.post('/api/questionnaire/menu-items-by-ids', getMenuItemsByIds);
  app.get('/api/questionnaire/dietary-recommendations', getDietaryRecommendations);

  // GEO / SEO: robots.txt, sitemap.xml, llms.txt. MUST be registered before
  // the vite / serveStatic catch-all below — otherwise the SPA's index.html
  // swallows these requests and AI crawlers receive HTML when they ask for
  // text/xml, silently failing every GEO signal we care about.
  registerSeoRoutes(app);

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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 3002;
  server.listen(port, () => {
    log(`serving on port ${port}`);
    registerScheduledJobs();
  });
})();
