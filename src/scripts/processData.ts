/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file processData.ts
 * @description Filters, aggregates, and optionally weights SARS-CoV-2 measurement data by station and date.
 * Only dPCR N1/N2 results are used. Values are averaged and converted for visualization.
 */

import * as d3 from "d3";
import type { RawDataEntry, ProcessedEntry } from "./types";
import populationData from "populationData";

/**
 * Extracts unique station names from the raw dataset.
 *
 * @param rawData - Array of raw measurement entries.
 * @returns Array of unique measuring_point strings.
 */
export function getStations(rawData: RawDataEntry[]): string[] {
  return [...new Set(rawData.map((d) => d.measuring_point))];
}

/**
 * Filters data by the selected measuring station and calculates SARS-CoV-2 values per date.
 * - Includes only SARS-CoV-2 test results, excluding unspecific or pan-sarbecovirus markers (e.g. E-gene).
 * - Uses only parameters with copy_number_* in their name.
 * - Computes the mean of copy_number values per test → aggregates test-level means per date.
 *
 * @param rawData - The full dataset loaded from the API.
 * @param station - The station name to filter data for.
 * @returns Array of data points with average, min, and max values for each date.
 */
export function filterDataByStation(
  rawData: RawDataEntry[],
  station: string
): ProcessedEntry[] {
  // Normalize extraction_date to Date objects
  const parsedData = rawData
    .map((d) => {
      const parsedDate = d3.timeParse("%d.%m.%Y")(d.extraction_date);
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        console.warn("Skipping entry with invalid date:", d.extraction_date);
        return null;
      }
      return { ...d, extraction_date: parsedDate }; // Leave as is
    })
    // Type guard here assumes the normalized type
    .filter((d): d is RawDataEntry & { extraction_date: Date } => d !== null);

  return parsedData
    .filter((d) => d.measuring_point === station)
    .map((d) => {
      const testMeans: number[] = [];

      const relevantResults = (d.results ?? []).filter((r) =>
        typeof r.name === "string" &&
        r.name.includes("SARS-CoV-2") &&
        !r.name.includes("E-gene") &&
        Array.isArray(r.parameter)
      );

      relevantResults.forEach((r) => {
        const resultValues: number[] = [];

        r.parameter?.forEach((p) => {
          if (
            !p ||
            typeof p.name !== "string" ||
            !p.name.startsWith("copy_number_") ||
            (typeof p.result !== "string" && typeof p.result !== "number")
          ) {
            return;
          }

          const v = parseFloat(p.result.toString().replace(",", "."));
          if (!isNaN(v)) resultValues.push(v);
        });

        if (resultValues.length > 0) {
          const meanPerTest = d3.mean(resultValues);
          if (meanPerTest !== undefined) testMeans.push(meanPerTest);
        }
      });

      return {
        date: d.extraction_date as Date,
        value: testMeans.length ? (d3.mean(testMeans) as number) : null,
        min: testMeans.length ? (d3.min(testMeans) as number) : null,
        max: testMeans.length ? (d3.max(testMeans) as number) : null,
      };
    })
    .filter(
      (d): d is ProcessedEntry =>
        !!d.date && d.value !== null && d.min !== null && d.max !== null
    );
}

/**
 * Computes the global maximum SARS-CoV-2 value across all processed datasets.
 * Adds a 10% padding for better Y-axis rendering.
 *
 * @param datasets - Array of ProcessedEntry[] from all stations.
 * @returns Rounded maximum value with padding.
 */
export function getGlobalMaxFromProcessedDatasets(datasets: ProcessedEntry[][]): number {
  const allValues = datasets.flatMap(data => data.map(d => d.value));
  const max = d3.max(allValues);
  return max ? Math.round(max * 1.1) : 0;
}

/**
 * Computes the weighted average value for a specific date from three stations.
 *
 * @param ruhleben - Value from Ruhleben (or null)
 * @param schoenerlinde - Value from Schönerlinde (or null)
 * @param wassmannsdorf - Value from Waßmannsdorf (or null)
 * @returns Weighted average based on population, or null if all inputs are null.
 */
export function computeWeightedAverage(
  ruhleben: number | null,
  schoenerlinde: number | null,
  wassmannsdorf: number | null
): number | null {
  const weightedContributions: number[] = [];
  let weightSum = 0;

  if (ruhleben !== null) {
    weightedContributions.push(ruhleben * populationData.Ruhleben);
    weightSum += populationData.Ruhleben;
  }

  if (schoenerlinde !== null) {
    weightedContributions.push(schoenerlinde * populationData["Schönerlinde"]);
    weightSum += populationData["Schönerlinde"];
  }

  if (wassmannsdorf !== null) {
    weightedContributions.push(wassmannsdorf * populationData["Waßmannsdorf"]);
    weightSum += populationData["Waßmannsdorf"];
  }

  if (weightSum === 0) return null;

  return d3.sum(weightedContributions) / weightSum;
}

/**
 * Computes a new time series by calculating the weighted average per date.
 *
 * @param ruhlebenSeries - Array of processed entries for Ruhleben
 * @param schoenerlindeSeries - Array for Schönerlinde
 * @param wassmannsdorfSeries - Array for Waßmannsdorf
 * @returns A new ProcessedEntry[] with weighted values per date
 */
export function computeWeightedSeries(
  ruhlebenSeries: ProcessedEntry[],
  schoenerlindeSeries: ProcessedEntry[],
  wassmannsdorfSeries: ProcessedEntry[]
): ProcessedEntry[] {
  const dates = new Set<string>();
  ruhlebenSeries.forEach(d => dates.add(d.date.toISOString()));
  schoenerlindeSeries.forEach(d => dates.add(d.date.toISOString()));
  wassmannsdorfSeries.forEach(d => dates.add(d.date.toISOString()));

  const sortedDates = Array.from(dates).sort();

  const result: ProcessedEntry[] = [];

  for (const isoDate of sortedDates) {
    const date = new Date(isoDate);

    const getValue = (series: ProcessedEntry[]) =>
      series.find(d => +d.date === +date)?.value ?? null;

    const v1 = getValue(ruhlebenSeries);
    const v2 = getValue(schoenerlindeSeries);
    const v3 = getValue(wassmannsdorfSeries);

    const weighted = computeWeightedAverage(v1, v2, v3);

    if (weighted !== null) {
      result.push({
        date,
        value: weighted,
        min: weighted,
        max: weighted,
      });
    }
  }

  return result;
}