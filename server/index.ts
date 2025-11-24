import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerFormRoutes } from "./formRoutes";
import { registerQuestionLibraryRoutes } from "./questionLibraryRoutes";
import formBuilderRoutes from "./formBuilderRoutes";
import ingredientRoutes from "./ingredientRoutes";
import { fixedCloneQuestion } from "./fixedCloneRoute";
import { 
  getWeddingMenuThemes, 
  getMenuItemsByCategory, 
  getMenuItemsByIds, 
  getDietaryRecommendations 
} from "./menuQuestionnaireRoutes";
import { setupVite, serveStatic, log } from "./vite";

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
  
  // Register form-building API routes
  registerFormRoutes(app);
  
  // Register question library API routes
  registerQuestionLibraryRoutes(app);
  
  // Register form builder API routes
  app.use('/api/form-builder', formBuilderRoutes);
  
  // Register ingredient management routes
  app.use('/api/ingredients', ingredientRoutes);
  
  // Register the fixed clone question endpoint
  app.post('/api/form-builder/library-questions/:id/clone', fixedCloneQuestion);
  
  // Register menu questionnaire routes for rich menu data integration
  app.get('/api/questionnaire/wedding-menu-themes', getWeddingMenuThemes);
  app.get('/api/questionnaire/menu-items', getMenuItemsByCategory);
  app.post('/api/questionnaire/menu-items-by-ids', getMenuItemsByIds);
  app.get('/api/questionnaire/dietary-recommendations', getDietaryRecommendations);

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
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
