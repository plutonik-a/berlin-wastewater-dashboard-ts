/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file main.ts
 * @description Application entry point. Loads data and renders the chart.
 */

import * as d3 from "d3";
import { loadData } from "./scripts/loadData";
import { filterDataByStation, getStations } from "./scripts/processData";
import { drawChart } from "./scripts/chart";
import type { RawDataEntry, ProcessedEntry } from "./scripts/types";
import "./styles/main.scss";

/**
 * Main entry point: loads data from the API, populates the station dropdown,
 * attaches change handler for interactivity, and renders initial chart.
 */
loadData()
  .then(
    ({ rawData }: { rawData: RawDataEntry[] }) => {
      const stations = getStations(rawData);

      const select: d3.Selection<HTMLSelectElement, unknown, HTMLElement, any> =
        d3.select("#stationSelect");

      // Populate dropdown options
      select
        .selectAll("option")
        .data(stations)
        .enter()
        .append("option")
        .text((d) => d)
        .attr("value", (d) => d);

      select.on("change", (event: Event) => {
        const target = event.target as HTMLSelectElement;
        const selectedStation = target.value;
        const filtered: ProcessedEntry[] = filterDataByStation(rawData, selectedStation);
        drawChart(filtered, rawData);
      });

      const initialData: ProcessedEntry[] = filterDataByStation(rawData, stations[0]);
      drawChart(initialData, rawData);
    }
  )
  .catch((error: unknown) => {
    console.error("Failed to load data:", error);
    const errorMessageElem = document.getElementById("error-message");
    if (errorMessageElem) {
      errorMessageElem.textContent = "Failed to load data.";
    }
  });