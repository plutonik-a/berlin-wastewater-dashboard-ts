/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file format.ts
 * @description Utility functions for formatting numbers and dates for display in the UI.
 */

/**
 * Formats a number with thousands separators using German locale.
 * E.g., 2693000 → "2.693.000"
 *
 * @param value - The number to format.
 * @returns The formatted string.
 */
export function formatNumberThousand(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a JavaScript Date object to dd.mm.yyyy format.
 * E.g., new Date(2024, 5, 9) → "09.06.2024"
 *
 * @param date - The Date object to format.
 * @returns Formatted date string.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats a JavaScript Date object to US English long format.
 * E.g., new Date(2025, 6, 16) → "July 16, 2025"
 *
 * @param date - The Date object to format.
 * @returns Formatted date string.
 */
export function formatDateUS(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}