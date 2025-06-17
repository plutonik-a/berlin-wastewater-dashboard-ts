/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Sets up a minimal Express server to serve:
 * - Static frontend assets from the `public/` folder (used by Vite)
 * - A JSON API endpoint at `/api/data` that serves `data/data.json`
 *
 * The server is compatible with modern ESM-style modules (via import/export).
 */

// Determine __dirname in ESM environments
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (HTML, CSS, images, etc.) from public/
app.use(express.static(path.resolve(__dirname, "../public")));

/**
 * API endpoint to return wastewater data from disk.
 * Responds with HTTP 500 if the file cannot be read.
 */
app.get("/api/data", (req, res) => {
  try {
    const dataPath = path.resolve(__dirname, "../data/data.json");
    const jsonData = fs.readFileSync(dataPath, "utf-8");
    res.setHeader("Content-Type", "application/json");
    res.send(jsonData);
  } catch (error) {
    console.error("Failed to load JSON:", error);
    res.status(500).json({ error: "Failed to load data" });
  }
});

/**
 * Starts the server on the specified port.
 */
app.listen(PORT, () => {
  console.log(`Express server running at: http://localhost:${PORT}`);
});