/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file processData.ts
 * @description Filters and aggregates SARS-CoV-2 measurement data by station and date.
 * Only dPCR N1/N2 results are used. Values are averaged and converted for visualization.
 */

import * as d3 from "d3";
import type { RawDataEntry, ProcessedEntry } from "./types";

/**
 * Extracts unique station names from the raw dataset.
 *
 * @param rawData - Array of raw measurement entries.
 * @returns Array of unique measuring_point strings.
 */
export function getStations(rawData: RawDataEntry[]): string[] {
  if (!Array.isArray(rawData)) {
    console.warn("getStations called with invalid rawData:", rawData);
    return [];
  }
  return [...new Set(rawData.map((d) => d.measuring_point))];
}

/**
 * Filters data by the selected measuring station and calculates SARS-CoV-2 values per date.
 * - Considers only dPCR results for N1 and N2.
 * - Aggregates copy_number_1–3 per test → all six values → mean, min, max.
 *
 * @param rawData - The full dataset loaded from the API.
 * @param station - The station name to filter data for.
 * @returns Array of data points with average, min, and max values for each date.
 */
export function filterDataByStation(
  rawData: RawDataEntry[],
  station: string
): ProcessedEntry[] {
  if (!Array.isArray(rawData)) {
    console.warn("filterDataByStation called with invalid rawData:", rawData);
    return [];
  }

  return rawData
    .filter((d) => d.measuring_point === station)
    .map((d) => {
      const values: number[] = [];

      const relevantResults = (d.results ?? []).filter(
        (r): r is Required<typeof r> =>
          !!r.name &&
          (r.name === "dPCR_1 SARS-CoV-2 (N1)" || r.name === "dPCR_2 SARS-CoV-2 (N2)") &&
          Array.isArray(r.parameter)
      );

      relevantResults.forEach((r) => {
        r.parameter.forEach((p) => {
          const v = parseFloat(p.result.toString().replace(",", "."));
          if (!isNaN(v)) values.push(v);
        });
      });

      if (values.length > 0 && values.length < 6) {
        console.warn(`Incomplete SARS-CoV-2 data on ${d.extraction_date}:`, values);
      }

      const date = d3.timeParse("%d.%m.%Y")(d.extraction_date);

      return {
        date: date as Date,
        value: values.length ? (d3.mean(values) as number) : null,
        min: values.length ? (d3.min(values) as number) : null,
        max: values.length ? (d3.max(values) as number) : null,
      };
    })
    .filter((d): d is ProcessedEntry =>
      !!d.date && d.value !== null && d.min !== null && d.max !== null
    );
}