/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file validateForChart.js
 * @description Validates only chart-relevant SARS-CoV-2 data structure.
 *              Ignores NGS, RSV, Influenza and non-SARS-CoV-2 tests.
 */

import fs from 'fs';
import path from 'path';

const filePath = path.resolve('public/data/data.json');

/**
 * Parses a German-style numeric string to float.
 * E.g. "126291,5036" → 126291.5036
 *
 * @param {string} value
 * @returns {number}
 */
function parseNumber(value) {
  return parseFloat(value.replace(',', '.'));
}

/**
 * Validates chart-relevant test results for one sample.
 *
 * @param {object} sample - A single data entry from data.json
 * @param {number} index - Index in the dataset
 * @throws {Error} If SARS-CoV-2 test data is malformed
 */
function validateChartRelevant(sample, index) {
  const relevantResults = (sample.results ?? []).filter(
    (r) =>
      typeof r.name === 'string' &&
      r.name.includes('SARS-CoV-2') &&
      !r.name.includes('E-gene') &&
      Array.isArray(r.parameter)
  );

  if (relevantResults.length === 0) {
    console.warn(`sample[${index}]: no SARS-CoV-2 results found`);
    return;
  }

  for (const [rIdx, result] of relevantResults.entries()) {
    const copyValues = result.parameter.filter(
      (p) =>
        p &&
        typeof p.name === 'string' &&
        p.name.startsWith('copy_number_') &&
        typeof p.result === 'string'
    );

    if (copyValues.length === 0) {
      throw new Error(
        `sample[${index}].results[${rIdx}]: no valid copy_number_* results`
      );
    }

    copyValues.forEach((p, pIdx) => {
      const num = parseNumber(p.result);
      if (isNaN(num)) {
        throw new Error(
          `sample[${index}].results[${rIdx}].parameter[${pIdx}]: invalid number "${p.result}"`
        );
      }
    });
  }
}

try {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Top-level data must be a non-empty array');
  }

  data.forEach((sample, i) => {
    validateChartRelevant(sample, i);
    // TODO: Add influenza check once used in chart
  });

  console.log(`Chart validation passed: ${data.length} records`);
  process.exit(0);
} catch (err) {
  console.error('Chart validation failed:', err.message);
  process.exit(1);
}