/**
 * @module back/routes/index
 * Registra todas las rutas de la API y sirve Swagger UI sin depender de CDN.
 */

import fs from "fs";
import path from "path";
import express, { Express } from "express";
import { getAbsoluteFSPath } from "swagger-ui-dist";

import authRoutes from "./auth";
import claimsRoutes from "./claims";
import dashboardRoutes from "./dashboard";
import diagramRoutes from "./diagrams";
import diagramStatsRoutes from "./diagramStats";
import examsRoutes from "./exams";
import progressRoutes from "./progress";
import questionsRoutes from "./questions";
import supervisorRoutes from "./supervisor";
import testSessionsRoutes from "./testSession";
import userRoutes from "./users";

export default function registerRoutes(app: Express) {
  const apiRouter = express.Router();

  const SWAGGER_DIST = getAbsoluteFSPath();

  apiRouter.get("/swagger-ui/swagger-ui.css", (_req, res) => {
    const cssPath = path.join(SWAGGER_DIST, "swagger-ui.css");
    let css = fs.readFileSync(cssPath, "utf8");
    css = css.replaceAll(/\/\*#\s*sourceMappingURL=.*?\*\//g, "");
    res.type("text/css").send(css);
  });

  apiRouter.use("/swagger-ui", express.static(SWAGGER_DIST));

  apiRouter.get("/openapi.yaml", (_req, res) => {
    const yamlPath = path.resolve(process.cwd(), "openapi.yaml");
    res.type("application/yaml").sendFile(yamlPath);
  });

  apiRouter.get("/docs", (_req, res) => {
    res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ERPlay API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/api/swagger-ui/swagger-ui.css" />
  <style>html,body{margin:0;padding:0;background:#fff}#swagger-ui{min-height:100vh}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/swagger-ui/swagger-ui-bundle.js"></script>
  <script src="/api/docs/init.js"></script>
</body>
</html>`);
  });

  apiRouter.get("/docs/init.js", (_req, res) => {
    res.type("application/javascript").send(`
      window.ui = SwaggerUIBundle({
        url: '/api/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true
      });
    `);
  });

  apiRouter.use("/auth", authRoutes);
  apiRouter.use("/users", userRoutes);

  apiRouter.use("/diagrams", diagramRoutes);
  apiRouter.use("/questions", questionsRoutes);

  apiRouter.use("/exams", examsRoutes);
  apiRouter.use("/test-sessions", testSessionsRoutes);

  apiRouter.use("/claims", claimsRoutes);
  apiRouter.use("/progress", progressRoutes);

  apiRouter.use("/dashboard", dashboardRoutes);
  apiRouter.use("/supervisor", supervisorRoutes);

  apiRouter.use("/admin/diagrams", diagramStatsRoutes);

  app.use("/api", apiRouter);
}
