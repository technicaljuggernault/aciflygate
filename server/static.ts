import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files ONLY for non-API paths
  const staticHandler = express.static(distPath);
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    staticHandler(req, res, next);
  });

  // SPA fallback - serve index.html for non-API, non-file paths
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
