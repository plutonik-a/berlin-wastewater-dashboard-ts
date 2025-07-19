/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * Fetches new wastewater COVID data from the API based on the latest date
 * found in the local public/data/data.json file. Designed for regular execution (e.g., via cron).
 * Only fetches data for days not yet present in the existing dataset.
 *
 * Steps:
 * - Reads the latest extraction_date from public/data/data.json
 * - Calculates next day and fetches until today
 * - Filters duplicates
 * - Appends new data and writes back to file
 */

import fs from "fs/promises";

const API_URL = "https://api.hygiene-monitor.de/openData/getCovidOpenDataByDateRange";

/**
 * Converts Date to YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Parses a date in dd.mm.yyyy format
 */
function parseCustomDate(dateStr) {
  const [day, month, year] = dateStr.split(".");
  return new Date(`${year}-${month}-${day}`);
}

/**
 * Adds one day to a given Date
 */
function addOneDay(date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

/**
 * Returns latest extraction_date from existing data
 */
function findLatestDate(data) {
  if (!data.length) return null;
  const sorted = [...data].sort((a, b) => parseCustomDate(b.extraction_date) - parseCustomDate(a.extraction_date));
  return sorted[0].extraction_date;
}

/**
 * Reads and parses public/data/data.json if it exists
 */
async function readExistingData() {
  try {
    const str = await fs.readFile("public/data/data.json", "utf-8");
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Filters out entries already present in existing data
 */
function filterDuplicates(existing, incoming) {
  return incoming.filter(
    newEntry =>
      !existing.some(
        old =>
          old.sample_number === newEntry.sample_number &&
          old.extraction_date === newEntry.extraction_date
      )
  );
}

/**
 * Fetches data from API for a given date range
 */
async function fetchData(start, end) {
  console.log(`Fetching data from ${start} to ${end}...`);
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      extraction_date_start: start,
      extraction_date_end: end,
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const json = await res.json();
  return Array.isArray(json.body) ? json.body : [];
}

/**
 * Main incremental fetch routine
 */
async function fetchIncremental() {
  try {
    const existing = await readExistingData();
    const latestDateStr = findLatestDate(existing);
    const latestDate = latestDateStr ? parseCustomDate(latestDateStr) : new Date("2022-02-01");
    const start = addOneDay(latestDate);
    const today = new Date();

    if (start > today) {
      console.log("No new dates to fetch.");
      return;
    }

    const newData = await fetchData(formatDate(start), formatDate(today));
    const unique = filterDuplicates(existing, newData);

    if (!unique.length) {
      console.log("No new unique data found.");
      return;
    }

    const combined = [...existing, ...unique].sort(
      (a, b) => parseCustomDate(a.extraction_date) - parseCustomDate(b.extraction_date)
    );

    await fs.writeFile("public/data/data.json", JSON.stringify(combined, null, 2), "utf-8");

    console.log(`Added ${unique.length} new records. Total: ${combined.length}`);
  } catch (err) {
    console.error("Fetch failed:", err.message);
    process.exit(1);
  }
}

fetchIncremental();