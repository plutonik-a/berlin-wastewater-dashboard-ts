/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file router.ts
 * @description Simple client-side routing based on URL pattern /{lang}/{pathogen}/{metric}
 */

/**
 * Parsed route information from the URL pathname.
 */
export interface RouteParams {
  lang: string;
  pathogen: string;
  metric: string;
}

/**
 * Route configuration defining which routes are valid and their display titles.
 */
export interface RouteConfig {
  title: string;
  isValid: boolean;
}

/**
 * Parses the URL pathname into route parameters.
 * Handles root path (/) by redirecting to default route.
 *
 * @param pathname - The pathname from window.location.pathname
 * @returns RouteParams object with lang, pathogen, and metric, or null if invalid
 */
export function parseRoute(pathname: string): RouteParams | null {
  // Handle root path - redirect to default route
  if (pathname === "/" || pathname === "") {
    return { lang: "en", pathogen: "sars-cov-2", metric: "wastewater" };
  }

  // Remove leading/trailing slashes and split
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");

  if (parts.length !== 3) {
    return null;
  }

  const [lang, pathogen, metric] = parts;

  if (!lang || !pathogen || !metric) {
    return null;
  }

  return { lang, pathogen, metric };
}

/**
 * Validates and returns configuration for a given route.
 *
 * @param route - The parsed route parameters
 * @returns RouteConfig with title and validity status
 */
export function getRouteConfig(route: RouteParams | null): RouteConfig {
  if (!route) {
    return { title: "Not Found", isValid: false };
  }

  const { lang, pathogen, metric } = route;

  // Validate language
  if (lang !== "en") {
    return { title: "Not Found", isValid: false };
  }

  // Validate metric
  if (metric !== "wastewater") {
    return { title: "Not Found", isValid: false };
  }

  // Handle different pathogens
  if (pathogen === "sars-cov-2") {
    return { title: "SARS-CoV-2 Wastewater", isValid: true };
  }

  if (pathogen === "influenza") {
    return { title: "Influenza Wastewater (placeholder)", isValid: true };
  }

  return { title: "Not Found", isValid: false };
}

/**
 * Gets the current route from window.location.pathname.
 *
 * @returns RouteParams or null if invalid
 */
export function getCurrentRoute(): RouteParams | null {
  return parseRoute(window.location.pathname);
}

/**
 * Callback function type for route changes.
 */
export type RouteChangeCallback = (route: RouteParams | null) => void;

let routeChangeCallback: RouteChangeCallback | null = null;

/**
 * Registers a callback function that will be called whenever the route changes.
 *
 * @param callback - Function to call when route changes
 */
export function onRouteChange(callback: RouteChangeCallback): void {
  routeChangeCallback = callback;
}

/**
 * Navigates to a specific path using the History API (no page reload).
 * Updates the URL and triggers the route change callback.
 *
 * @param path - Full path to navigate to (e.g., "/en/sars-cov-2/wastewater")
 */
export function navigateToPath(path: string): void {
  const route = parseRoute(path);
  if (!route) {
    console.error("Invalid path:", path);
    return;
  }

  const config = getRouteConfig(route);
  if (!config.isValid) {
    console.error("Route is not valid:", path);
    return;
  }

  // Update URL using History API
  window.history.pushState({ route }, "", path);

  // Trigger route change callback
  if (routeChangeCallback) {
    routeChangeCallback(route);
  }
}

/**
 * Navigates to a specific route by constructing the path.
 *
 * @param lang - Language code (e.g., "en")
 * @param pathogen - Pathogen identifier (e.g., "sars-cov-2", "influenza")
 * @param metric - Metric identifier (e.g., "wastewater")
 */
export function navigateTo(lang: string, pathogen: string, metric: string): void {
  const newPath = `/${lang}/${pathogen}/${metric}`;
  navigateToPath(newPath);
}

/**
 * Initializes the router and sets up popstate event listener for browser back/forward buttons.
 * Should be called once when the application starts.
 */
export function initRouter(): void {
  // Handle browser back/forward buttons
  window.addEventListener("popstate", () => {
    const route = getCurrentRoute();
    if (routeChangeCallback) {
      routeChangeCallback(route);
    }
  });
}

