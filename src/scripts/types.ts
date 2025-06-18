/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file types.ts
 * @description Shared TypeScript types for measurement data structures.
 */

/**
 * Individual parameter entry (e.g., copy_number_1)
 */
export type TestParameter = {
  name?: string;
  result: string | number;
};

/**
 * Single test result (e.g., dPCR_1 SARS-CoV-2 N1)
 */
export type TestResult = {
  name?: string;
  parameter?: TestParameter[];
};

/**
 * Raw API entry (per sample)
 */
export type RawDataEntry = {
  measuring_point: string;
  extraction_date: string;
  results?: TestResult[];
};

/**
 * Aggregated and processed entry per date and location
 */
export type ProcessedEntry = {
  date: Date;
  value: number;
  min: number;
  max: number;
};