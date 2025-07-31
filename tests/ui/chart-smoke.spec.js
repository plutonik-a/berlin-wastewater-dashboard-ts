/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file chart-smoke.spec.js
 * @description Smoke test for chart rendering using Playwright.
 */

import { test, expect } from '@playwright/test';

test('Chart renders with data', async ({ page }) => {
  await page.goto('/'); // baseURL wird automatisch ergänzt

  const chartSvg = page.locator('.chart-svg');
  await expect(chartSvg).toBeVisible();

  const points = page.locator('.chart-point');
  const line = page.locator('.chart-line');

  const hasPoints = await points.count();
  const hasLine = await line.count();

  expect(hasPoints > 0 || hasLine > 0).toBeTruthy();
});