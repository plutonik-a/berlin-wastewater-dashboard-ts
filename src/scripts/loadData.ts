/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file loadData.ts
 * @description Loads raw measurement data from the Express API.
 * Expects the response to be an array of structured measurement objects.
 */

import type { RawDataEntry } from "./types";

/**
 * Loads measurement data from the Express API endpoint.
 *
 * @returns Promise resolving to an object containing the raw data array.
 * @throws If the request fails or the response is not a valid array.
 */
export async function loadData(): Promise<{ rawData: RawDataEntry[] }> {
  const response = await fetch("/data/data.json");

  if (!response.ok) {
    let errorMsg = `Failed to load data (HTTP ${response.status} ${response.statusText})`;
    try {
      const err = await response.json();
      if (err && err.error) {
        errorMsg = `${err.error} (HTTP ${response.status} ${response.statusText})`;
      }
    } catch (e) {
      console.error("Failed to parse error response as JSON:", e);
    }
    throw new Error(errorMsg);
  }

  const raw = await response.json();

  if (!Array.isArray(raw)) {
    throw new Error("API response is not an array");
  }

  return { rawData: raw };
}