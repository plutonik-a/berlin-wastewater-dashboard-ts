/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file chart.ts
 * @description Renders the interactive time series chart using D3.js.
 * Handles scales, axes, tooltips, and responsiveness.
 */

import * as d3 from "d3";
import { formatNumberThousand, formatDate } from "./format";
import { getGlobalMaxFromProcessedDatasets } from "./processData";
import type { ProcessedEntry, RawDataEntry } from "./types";

/**
 * Represents a single data point in the chart.
 */
type DataPoint = {
  date: Date;
  value: number;
};

/**
 * Renders an interactive time series chart using D3.js.
 *
 * Features:
 * - Smooth spline rendering via d3.curveMonotoneX
 * - Combined area and line visualization
 * - Tooltip with nearest value highlighting on hover/touch
 * - Custom vertical "Today" tick marker if within range
 * - Responsive axis ticks with month-wise filtering
 *
 * @param data - Filtered data for the selected station (aggregated by date)
 * @param rawData - Full raw dataset for calculating x-axis extent
 * @param allProcessed - Aggregated values for all stations (for y-axis scaling)
 */
export function drawChart(
  data: ProcessedEntry[],
  rawData: RawDataEntry[],
  allProcessed: ProcessedEntry[][]
) {
  const svg = d3.select("svg")
    .attr("viewBox", "0 0 1000 600")
    .attr("preserveAspectRatio", "xMidYMid meet");

  svg.selectAll("*").remove();

  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = 1000 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const allValidDates = rawData
    .map(d => new Date(d.extraction_date))
    .filter(d => d instanceof Date && !isNaN(d.getTime()) && d <= new Date());

  const xExtent = d3.extent(allValidDates) as [Date, Date];

  // Extend the x-axis date end by 1 month, in order to visually pad the end of the chart
  // Avoids the last data point being too close to the right edge
  const paddedEndDate = d3.timeMonth.offset(xExtent[1], 1);

  const x = d3.scaleTime()
    .domain([xExtent[0], paddedEndDate])
    .range([0, width]);

  const globalMax = getGlobalMaxFromProcessedDatasets(allProcessed);

  const y = d3.scaleLinear()
    .domain([0, globalMax])
    .nice()
    .range([height, 0]);

  // "Today" tick mark at the end of x-axis
  const today = new Date();

  // Render a vertical tick + label for "Today" 
  // if it lies within the padded x-axis domain
  if (today <= paddedEndDate) {
    g.append("text")
      .attr("x", x(today))
      .attr("y", height + 9) // same height as D3 axis ticks
      .attr("dy", "0.71em")  // same vertical offset as axis ticks!
      .attr("text-anchor", "middle")
      .attr("class", "chart__today-label")
      .text("Today");

    g.append("line")
      .attr("x1", x(today))
      .attr("x2", x(today))
      .attr("y1", height)
      .attr("y2", height + 6)
      .attr("class", "chart__today-tick");
  }

  // Filter data to only include points within the x domain
  const interval = d3.utcMonth.every(2);

  if (!interval) throw new Error("Invalid tick interval");

  // Exclude any ticks on or after the current month 
  // to avoid overlapping with custom "Today" tick
  const ticks = x.ticks(interval).filter(d => d < d3.timeMonth.floor(today));

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3.axisBottom(x)
        .tickValues(ticks)
        .tickFormat((d: Date | d3.NumberValue) =>
          d instanceof Date ? d3.timeFormat("%b %y")(d) : ""
        )
    );

  g.append("g").call(d3.axisLeft(y));

  // Axis labels
  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .attr("class", "chart__axis-label")
    .text("Date");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .attr("class", "chart__axis-label")
    .text("Virus Load (Average)");

  // Line path
  const line = d3.line<DataPoint>()
    .x(d => x(d.date))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  // Area path: Fills the area under the line
  const area = d3.area<DataPoint>()
    .x(d => x(d.date))
    .y0(y(0))
    .y1(d => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(data)
    .attr("class", "chart__area-fill")
    .attr("d", area);

  // Line path
  g.append("path")
    .datum(data)
    .attr("class", "chart__line")
    .attr("d", line);

  const focusPoint = g.append("circle")
    .attr("class", "chart__focus-point");

  const focusLine = g.append("line")
    .attr("class", "chart__focus-line")
    .attr("y1", 0)
    .attr("y2", height);

  // Tooltip
  const tooltip = d3.select("#tooltip");

  const bisectDate = d3.bisector<DataPoint, Date>(d => d.date).left;

  const overlay = svg.append("rect")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .attr("class", "chart__overlay");

  /**
   * Updates the tooltip and vertical guide line.
   */
  function updateTooltip(event: PointerEvent | TouchEvent) {
    const pointer = d3.pointer(event as any);
    const mx = pointer[0];
    const x0 = x.invert(mx);
    const i = bisectDate(data, x0, 1);
    const d0 = data[i - 1];
    const d1 = data[i];

    const dClosest = !d0 ? d1 : !d1 ? d0 : (x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0);
    if (!dClosest) return;

    focusPoint
      .attr("cx", x(dClosest.date))
      .attr("cy", y(dClosest.value))
      .style("opacity", 1);

    focusLine
      .attr("x1", x(dClosest.date))
      .attr("x2", x(dClosest.date))
      .attr("y1", y(0))              // Y-axis starts at 0
      .attr("y2", y(dClosest.value)) // focus line extends to the value
      .style("opacity", 1);

    tooltip
      .attr("aria-hidden", "false")
      .style("opacity", 1)
      .html(
        `${formatDate(dClosest.date)}<br/>
        ${formatNumberThousand(dClosest.value)} RNA copies / L`
      );

    const tooltipNode = tooltip.node() as HTMLElement;
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;
    const pageX = (event as MouseEvent).pageX;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 10;

    // Position tooltip vertically: 
    // center on pointer, adjust to stay in viewport
    // to avoid tooltip clipping
    let top = y(dClosest.value) + margin.top - tooltipHeight / 2;
    if (top + tooltipHeight + padding > vh) {
      top = vh - tooltipHeight - padding;
    }
    if (top < padding) top = padding;

    let left = pageX + 15;
    if (left + tooltipWidth + padding > vw) {
      left = pageX - tooltipWidth - 15;
    }
    if (left < padding) left = padding;

    // Apply final tooltip position
    tooltip
      .style("left", `${left}px`)
      .style("top", `${top}px`);
  }

  overlay
    .on("mousemove", updateTooltip)
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
      tooltip.attr("aria-hidden", "true");
      focusLine.style("opacity", 0);
      focusPoint.style("opacity", 0);
    })
    .on("touchmove", event => {
      event.preventDefault();
      updateTooltip(event);
    })
    .on("touchend", () => {
      tooltip.style("opacity", 0);
      tooltip.attr("aria-hidden", "true");
      focusLine.style("opacity", 0);
      focusPoint.style("opacity", 0);
    });
}