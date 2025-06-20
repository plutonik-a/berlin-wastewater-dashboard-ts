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
import type { ProcessedEntry, RawDataEntry } from "./types";

/**
 * Represents a single data point in the chart.
 */
type DataPoint = {
  date: Date;
  value: number;
};

/**
 * Draws a D3 line chart with responsive scaling and smoothed curve.
 * - Uses d3.curveMonotoneX to render a smooth spline
 * - Highlights the nearest data point on hover with a vertical guide line and value label
 * - Omits visual point markers for a cleaner appearance
 *
 * @param data - Filtered station-specific data (pre-aggregated by date)
 * @param rawData - Full dataset used to determine global Y-axis maximum
 */
export function drawChart(data: ProcessedEntry[], rawData: RawDataEntry[]) {
  const svg = d3.select("svg")
    .attr("viewBox", "0 0 1000 600")
    .attr("preserveAspectRatio", "xMidYMid meet");

  svg.selectAll("*").remove();

  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = 1000 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const globalMax = d3.max(rawData, d =>
    d3.max(d.results?.[0]?.parameter || [], (p: any) => +p.result)
  ) ?? 0;

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date) as [Date, Date])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, globalMax]).nice()
    .range([height, 0]);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("g").call(d3.axisLeft(y));

  // Axis labels
  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Date");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Virus Load (Average)");

  // Line path
  const line = d3.line<DataPoint>()
    .x(d => x(d.date))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#007acc")
    .attr("stroke-width", 3)
    .attr("d", line);

  const focusPoint = g.append("circle")
    .attr("r", 5)
    .attr("fill", "#007acc")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Tooltip
  const tooltip = d3.select("#tooltip");
  const focusLine = g.append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .attr("y1", 0)
    .attr("y2", height)
    .style("opacity", 0);

  const bisectDate = d3.bisector<DataPoint, Date>(d => d.date).left;

  const overlay = svg.append("rect")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all");

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
      .style("opacity", 1);

    tooltip
      .style("opacity", 1)
      .html(
        `${formatDate(dClosest.date)}<br/>
        ${formatNumberThousand(dClosest.value)} RNA copies / L`
      );

    const tooltipNode = tooltip.node() as HTMLElement;
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;
    const pageX = (event as MouseEvent).pageX;
    const pageY = (event as MouseEvent).pageY;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 10;

    // Position tooltip vertically: 
    // center on pointer, adjust to stay in viewport
    // to avoid tooltip clipping
    let top = pageY - tooltipHeight / 2;
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
      focusLine.style("opacity", 0);
      focusPoint.style("opacity", 0);
    })
    .on("touchmove", event => {
      event.preventDefault();
      updateTooltip(event);
    })
    .on("touchend", () => {
      tooltip.style("opacity", 0);
      focusLine.style("opacity", 0);
      focusPoint.style("opacity", 0);
    });
}