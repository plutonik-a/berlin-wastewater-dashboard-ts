/*!
 * Berlin Wastewater Dashboard
 * Copyright (c) 2025 Alexandra von Criegern
 * Licensed under the ISC License.
 */

/**
 * @file chart.ts
 * @description Renders the interactive time series chart using D3.js.
 * Provides scales, axes, tooltips, and responsive behaviour.
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
 * Renders an interactive time series chart.
 *
 * @param data - Filtered dataset for the selected station (aggregated by date).
 * @param rawData - Full raw dataset for x-axis extent calculation.
 * @param allProcessed - Aggregated datasets for all stations (for global y-axis scaling).
 */
export function drawChart(
  data: ProcessedEntry[],
  rawData: RawDataEntry[],
  allProcessed: ProcessedEntry[][]
) {
  const container = document.querySelector(".chart-container") as HTMLElement;
  const containerStyles = getComputedStyle(container);
  const chartWidthStr = containerStyles.width;
  const chartHeightStr = containerStyles.height;

  const chartWidth = chartWidthStr ? parseFloat(chartWidthStr.replace("px", "")) : 0;
  const chartHeight = chartHeightStr ? parseFloat(chartHeightStr.replace("px", "")) : 0;

  const baseWidth = chartWidth || 1332;
  const baseHeight = chartHeight || 300;

  const yAxisContainer = document.querySelector(".y-axis") as HTMLElement;
  const yWidth = yAxisContainer?.getBoundingClientRect().width || 50;

  const svg = d3
    .select("#chart-svg")
    .attr("width", baseWidth)
    .attr("height", baseHeight);

  const xAxisSvg = d3
    .select("#x-axis-svg")
    .attr("width", baseWidth)
    .attr("height", 40);

  const yAxisSvg = d3
    .select("#y-axis-svg")
    .attr("width", yWidth)
    .attr("height", baseHeight);

  svg.selectAll("*").remove();
  xAxisSvg.selectAll("*").remove();
  yAxisSvg.selectAll("*").remove();

  const margin = { top: 0, right: 30, bottom: 0, left: 10 };
  const width = baseWidth - margin.left - margin.right;
  const height = baseHeight - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const allValidDates = rawData
    .map((d) => new Date(d.extraction_date))
    .filter((d) => d instanceof Date && !isNaN(d.getTime()) && d <= new Date());

  const xExtent = d3.extent(allValidDates) as [Date, Date];
  const today = new Date();
  let paddedEndDate = d3.timeMonth.offset(xExtent[1], 1);
  if (today > paddedEndDate) {
    paddedEndDate = today;
  }

  const x = d3.scaleTime().domain([xExtent[0], paddedEndDate]).range([0, width]);

  const globalMax = getGlobalMaxFromProcessedDatasets(allProcessed);

  const topPadding = 10;
  const y = d3.scaleLinear()
    .domain([0, globalMax])
    .nice()
    .range([height, -topPadding]);

  const interval = d3.utcMonth.every(2);
  if (!interval) throw new Error("Invalid tick interval");
  const ticks = x.ticks(interval).filter((d) => d < d3.timeMonth.floor(today));

  // Draw X-axis ticks
  ticks.forEach((tickDate) => {
    const tickX = margin.left + x(tickDate);
    xAxisSvg
      .append("line")
      .attr("x1", tickX)
      .attr("x2", tickX)
      .attr("y1", 0)
      .attr("y2", 6)
      .attr("class", "chart-x-tick-line");

    xAxisSvg
      .append("text")
      .attr("x", tickX)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("class", "chart-tick-label")
      .text(d3.timeFormat("%b %y")(tickDate));
  });

  if (today <= paddedEndDate) {
    const todayX = margin.left + x(today);
    xAxisSvg
      .append("line")
      .attr("x1", todayX)
      .attr("x2", todayX)
      .attr("y1", 0)
      .attr("y2", 10)
      .attr("class", "chart-today-tick");
    xAxisSvg
      .append("text")
      .attr("x", todayX)
      .attr("y", 13)
      .attr("dy", "0.71em")
      .attr("text-anchor", "middle")
      .attr("class", "chart-today-label")
      .text("Today");
  }

  // Draw Y-axis grid lines in chart SVG
  g.append("g")
    .call(
      d3.axisLeft(y).tickSize(-width).tickFormat(() => "")
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll(".tick line").attr("class", "chart-grid-line")
    );

  yAxisSvg
    .append("g")
    .attr("transform", `translate(${yWidth},${margin.top})`)
    .call(
      d3.axisLeft(y)
        .tickSize(0)
        .tickPadding(5)
    )
    .call((g) => g.select(".domain").remove());

  // Draw area and line
  const line = d3
    .line<DataPoint>()
    .x((d) => x(d.date))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  const area = d3
    .area<DataPoint>()
    .x((d) => x(d.date))
    .y0(y(0))
    .y1((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path").datum(data).attr("class", "chart-area-fill").attr("d", area);
  g.append("path").datum(data).attr("class", "chart-line").attr("d", line);

  const focusPoint = g.append("circle").attr("class", "chart-focus-point");
  const focusLine = g
    .append("line")
    .attr("class", "chart-focus-line")
    .attr("y1", 0)
    .attr("y2", height);

  const tooltip = d3.select("#tooltip");
  const bisectDate = d3.bisector<DataPoint, Date>((d) => d.date).left;

  const overlay = svg
    .append("rect")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .attr("width", width)
    .attr("height", height)
    .attr("class", "chart-overlay");

  function updateTooltip(event: PointerEvent | TouchEvent) {
    const pointer = d3.pointer(event as any);
    const mx = pointer[0];
    const x0 = x.invert(mx);
    const i = bisectDate(data, x0, 1);
    const d0 = data[i - 1];
    const d1 = data[i];
    const dClosest = !d0
      ? d1
      : !d1
        ? d0
        : x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime()
          ? d1
          : d0;
    if (!dClosest) return;

    focusPoint
      .attr("cx", x(dClosest.date))
      .attr("cy", y(dClosest.value))
      .style("opacity", 1);
    focusLine
      .attr("x1", x(dClosest.date))
      .attr("x2", x(dClosest.date))
      .attr("y1", y(0))
      .attr("y2", y(dClosest.value))
      .style("opacity", 1);

    tooltip
      .attr("aria-hidden", "false")
      .style("opacity", 1)
      .html(
        `${formatDate(dClosest.date)}<br/>${formatNumberThousand(
          dClosest.value
        )} RNA copies / L`
      );

    const tooltipNode = tooltip.node() as HTMLElement;
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;
    const pageX = (event as MouseEvent).pageX;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 10;

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
    .on("touchmove", (event) => {
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