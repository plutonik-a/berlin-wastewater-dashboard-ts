/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

import fs from "fs";
import path from "path";

const header = `/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */`;

// Ignored directories (node_modules, dist, .git)
const IGNORED_DIRS = ["node_modules", "dist"];

/**
 * Check if the file is hidden (e.g. starts with a dot)
 * @param {string} filePath
 * @returns {boolean}
 */
function isHidden(filePath) {
  return path.basename(filePath).startsWith(".");
}

/**
 * Check if the content already contains a header comment mentioning the project or license
 * @param {string} content
 * @returns {boolean}
 */
function hasHeader(content) {
  const headerRegex = /^(\s*(\/\*![\s\S]*?\*\/|<!--[\s\S]*?-->))/i;
  const match = content.match(headerRegex);
  if (!match) return false;
  const headerBlock = match[1];
  return /Berlin Wastewater Dashboard|ISC License/i.test(headerBlock);
}

/**
 * Add header comment to supported file types (.js, .css, .html)
 * @param {string} filePath
 */
function addHeaderToFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  if (hasHeader(content)) return;

  const ext = path.extname(filePath);
  let newContent;

  if (ext === ".html") {
    newContent = `<!--\n${header.replace(/\n/g, "\n ")}\n-->\n\n${content}`;
  } else if (ext === ".css" || ext === ".scss" || ext === ".js") {
    newContent = header + "\n\n" + content;
  } else {
    return;
  }

  fs.writeFileSync(filePath, newContent, "utf8");
  console.log(`Header added to: ${filePath}`);
}

/**
 * Recursively process all files in folder, skipping hidden files, ignored directories and unsupported extensions
 * @param {string} folderPath
 */
function processFolder(folderPath) {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (isHidden(fullPath)) continue;
    if (entry.isDirectory() && IGNORED_DIRS.includes(entry.name)) continue;

    if (entry.isDirectory()) {
      processFolder(fullPath);
    } else if (entry.isFile() && [".js", ".ts", ".css", ".scss", ".html"].includes(path.extname(entry.name))) {
      addHeaderToFile(fullPath);
    }
  }
}

// Start folder: argument or current directory
const targetFolder = process.argv[2] || ".";
processFolder(targetFolder);