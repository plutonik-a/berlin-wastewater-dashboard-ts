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
import {
  filterDataByStation,
  getStations,
  computeWeightedSeries,
} from "./scripts/processData";
import { drawChart } from "./scripts/chart";
import type { RawDataEntry, ProcessedEntry } from "./scripts/types";
import "./styles/main.scss";

let rawDataCurrent: RawDataEntry[] = [];
let filteredDataCurrent: ProcessedEntry[] = [];
let allProcessedCurrent: ProcessedEntry[][] = [];

/**
 * Loads data, populates the station dropdown, renders the initial chart,
 * and attaches event handlers for interactivity and responsiveness.
 */
loadData()
  .then(({ rawData }: { rawData: RawDataEntry[] }) => {
    // Parse dates robustly for comparison
    const parseDate = d3.timeParse("%d.%m.%Y");
    const parsedDates = rawData
      .map((d) => parseDate(d.extraction_date))
      .filter(Boolean) as Date[];
    const latestDate = d3.max(parsedDates);

    const stations = getStations(rawData);
    const select: d3.Selection<HTMLSelectElement, unknown, HTMLElement, any> =
      d3.select("#stationSelect");
    const STATION_WEIGHTED_OPTION = "Berlin Trend (excl. BER)";

    // Populate dropdown options
    select
      .selectAll("option")
      .data([...stations, STATION_WEIGHTED_OPTION])
      .enter()
      .append("option")
      .text((d) => d)
      .attr("value", (d) => d);

    // Prepare processed datasets for all stations (used for Y-axis max)
    const allProcessed: ProcessedEntry[][] = stations.map((station) =>
      filterDataByStation(rawData, station)
    );

    // Prepare station datasets for weighting
    const ruhleben = allProcessed[stations.indexOf("Klärwerk Ruhleben")];
    const schoenerlinde = allProcessed[stations.indexOf("Klärwerk Schönerlinde")];
    const wassmannsdorf = allProcessed[stations.indexOf("Klärwerk Waßmannsdorf")];
    const weightedCurve = computeWeightedSeries(
      ruhleben,
      schoenerlinde,
      wassmannsdorf
    );

    rawDataCurrent = rawData;
    allProcessedCurrent = allProcessed;

    select.on("change", (event: Event) => {
      const target = event.target as HTMLSelectElement;
      const selectedStation = target.value;

      const filtered =
        selectedStation === STATION_WEIGHTED_OPTION
          ? weightedCurve
          : filterDataByStation(rawData, selectedStation);

      filteredDataCurrent = filtered;
      drawChart(filtered, rawData, allProcessed);
    });

    const initialData: ProcessedEntry[] = filterDataByStation(
      rawData,
      stations[0]
    );
    filteredDataCurrent = initialData;
    drawChart(initialData, rawData, allProcessed);

    window.addEventListener("resize", () => {
      drawChart(filteredDataCurrent, rawDataCurrent, allProcessedCurrent);
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to load data:", error);
    const errorMessageElem = document.getElementById("error-message");
    if (errorMessageElem) {
      errorMessageElem.textContent = "Failed to load data.";
    }
  });