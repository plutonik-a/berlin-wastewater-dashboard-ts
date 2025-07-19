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
 * Configuration options for rendering the chart.
 */
export interface ChartConfig {
  /** CSS selector for the container where the chart SVG resides. */
  containerSelector: string;

  /** Filtered dataset for the selected station (aggregated by date). */
  data: ProcessedEntry[];

  /** Raw dataset used for calculating x-axis extents. */
  rawData: RawDataEntry[];

  /** Aggregated datasets for all stations (used for global y-axis scaling). */
  allProcessed: ProcessedEntry[][];
}

/**
 * Renders an interactive time series chart with D3.js.
 *
 * This function draws the chart inside the specified container, including axes,
 * grid lines, area and line plots, and interactive tooltips.
 *
 * @param config - Chart configuration object containing data and container selector.
 */
export function drawChart(config: ChartConfig): void {
  const { containerSelector, data, rawData, allProcessed } = config;

  const container = document.querySelector(containerSelector) as HTMLElement;
  const yAxisContainer = document.querySelector(".y-axis") as HTMLElement;

  const { width: baseWidth, height: baseHeight } =
    getContainerDimensions(container);
  const yWidth =
    yAxisContainer?.getBoundingClientRect().width || 50;

  const svg = selectAndPrepareSvg("#chart-svg", baseWidth, baseHeight);
  const xAxisSvg = selectAndPrepareSvg("#x-axis-svg", baseWidth, 40);
  const yAxisSvg = selectAndPrepareSvg("#y-axis-svg", yWidth, baseHeight);

  const margin = { top: 0, right: 30, bottom: 0, left: 10 };
  const width = baseWidth - margin.left - margin.right;
  const height = baseHeight - margin.top - margin.bottom;

  const x = createXScale(rawData, width);
  const y = createYScale(allProcessed, height);

  drawXAxis(xAxisSvg, x, width, margin, new Date());
  drawYAxis(yAxisSvg, y, yWidth, margin.top);

  const g = svg
    .append<SVGGElement>("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  drawGridLines(g, y, width);
  drawLineAndArea(g, data, x, y);

  addTooltip(g, svg, x, y, data, margin, width, height);
}

/**
 * Computes the container dimensions for the chart.
 *
 * @param container - The HTML element containing the chart.
 * @returns Object with width and height in pixels.
 */
function getContainerDimensions(
  container: HTMLElement
): { width: number; height: number } {
  const styles = getComputedStyle(container);
  const width =
    parseFloat(styles.width.replace("px", "")) || 1332;
  const height =
    parseFloat(styles.height.replace("px", "")) || 300;
  return { width, height };
}

/**
 * Selects the SVG element and clears any existing content.
 *
 * @param selector - CSS selector for the SVG element.
 * @param width - Width to set on the SVG.
 * @param height - Height to set on the SVG.
 * @returns D3 selection of the cleared SVG element.
 */
function selectAndPrepareSvg(
  selector: string,
  width: number,
  height: number
): d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown> {
  const svg = d3
    .select<SVGSVGElement, unknown>(selector)
    .attr("width", width)
    .attr("height", height);

  svg.selectAll("*").remove();
  return svg;
}

/**
 * Creates a time scale for the x-axis based on the raw dataset.
 *
 * @param rawData - Full dataset containing extraction dates.
 * @param width - Width of the chart area for scale range.
 * @returns Configured D3 time scale for the x-axis.
 */
function createXScale(
  rawData: RawDataEntry[],
  width: number
): d3.ScaleTime<number, number> {
  const dates = rawData
    .map((d) => new Date(d.extraction_date))
    .filter(
      (d) =>
        !isNaN(d.getTime()) && d <= new Date()
    );

  const xExtent = d3.extent(dates) as [Date, Date];
  let endDate = d3.timeMonth.offset(xExtent[1], 1);

  if (new Date() > endDate) {
    endDate = new Date();
  }

  return d3
    .scaleTime()
    .domain([xExtent[0], endDate])
    .range([0, width]);
}

/**
 * Creates a linear scale for the y-axis based on all station datasets.
 *
 * @param allProcessed - Aggregated datasets from all stations.
 * @param height - Height of the chart area for scale range.
 * @returns Configured D3 linear scale for the y-axis.
 */
function createYScale(
  allProcessed: ProcessedEntry[][],
  height: number
): d3.ScaleLinear<number, number> {
  const globalMax =
    getGlobalMaxFromProcessedDatasets(allProcessed);
  return d3
    .scaleLinear()
    .domain([0, globalMax])
    .nice()
    .range([height, -10]);
}

/**
 * Draws the horizontal x-axis with ticks and optional "Today" marker.
 */
function drawXAxis(
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  x: d3.ScaleTime<number, number>,
  width: number,
  margin: { left: number },
  today: Date
): void {
  const interval = d3.utcMonth.every(2);
  const ticks = x
    .ticks(interval!)
    .filter((d) => d < d3.timeMonth.floor(today));

  svg
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", margin.left + width)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("class", "chart-x-axis-line");

  ticks.forEach((tickDate) => {
    const tickX = margin.left + x(tickDate);

    svg
      .append("line")
      .attr("x1", tickX)
      .attr("x2", tickX)
      .attr("y1", 0)
      .attr("y2", 6)
      .attr("class", "chart-x-tick-line");

    svg
      .append("text")
      .attr("x", tickX)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("class", "chart-tick-label")
      .text(d3.timeFormat("%b %y")(tickDate));
  });

  if (today <= x.domain()[1]) {
    const todayX = margin.left + x(today);

    svg
      .append("line")
      .attr("x1", todayX)
      .attr("x2", todayX)
      .attr("y1", 0)
      .attr("y2", 10)
      .attr("class", "chart-today-tick");

    svg
      .append("text")
      .attr("x", todayX)
      .attr("y", 13)
      .attr("dy", "0.71em")
      .attr("text-anchor", "middle")
      .attr("class", "chart-today-label")
      .text("Today");
  }
}

/**
 * Draws the vertical y-axis with tick labels.
 */
function drawYAxis(
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  y: d3.ScaleLinear<number, number>,
  yWidth: number,
  topMargin: number
): void {
  svg
    .append("g")
    .attr("transform", `translate(${yWidth},${topMargin})`)
    .call(
      d3.axisLeft(y).tickSize(0).tickPadding(5)
    )
    .call((g) => g.select(".domain").remove());
}

/**
 * Draws horizontal grid lines in the chart area.
 */
function drawGridLines(
  g: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
  y: d3.ScaleLinear<number, number>,
  width: number
): void {
  g.append("g")
    .call(
      d3.axisLeft(y).tickSize(-width).tickFormat(() => "")
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll(".tick line").attr("class", "chart-grid-line")
    );
}

/**
 * Draws the area and line representing the dataset.
 */
function drawLineAndArea(
  g: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
  data: ProcessedEntry[],
  x: d3.ScaleTime<number, number>,
  y: d3.ScaleLinear<number, number>
): void {
  const area = d3
    .area<ProcessedEntry>()
    .x((d) => x(d.date))
    .y0(y(0))
    .y1((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  const line = d3
    .line<ProcessedEntry>()
    .x((d) => x(d.date))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(data)
    .attr("class", "chart-area-fill")
    .attr("d", area);

  g.append("path")
    .datum(data)
    .attr("class", "chart-line")
    .attr("d", line);
}

/**
 * Adds interactive tooltip behaviour to the chart.
 * Handles focus indicators (point and vertical line) and
 * positions the tooltip dynamically with flip logic.
 * Supports click-only interaction for data exploration.
 *
 * @param g - The D3 selection of the chart group (<g> element).
 * @param svg - The D3 selection of the parent SVG element.
 * @param x - D3 time scale for the X axis.
 * @param y - D3 linear scale for the Y axis.
 * @param data - The processed dataset used for tooltip interaction.
 * @param margin - Margin object defining the chart padding.
 * @param width - The width of the inner chart area (excluding margins).
 * @param height - The height of the inner chart area (excluding margins).
 */
function addTooltip(
  g: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  x: d3.ScaleTime<number, number>,
  y: d3.ScaleLinear<number, number>,
  data: ProcessedEntry[],
  margin: { top: number; right: number; bottom: number; left: number },
  width: number,
  height: number
): void {
  const tooltip = d3.select("#tooltip");
  const bisectDate = d3.bisector<ProcessedEntry, Date>((d) => d.date).left;

  const focusPoint = g
    .append("circle")
    .attr("class", "chart-focus-point");

  const focusLine = g
    .append("line")
    .attr("class", "chart-focus-line")
    .attr("y1", y(0))
    .attr("y2", y(0)); // Start collapsed

  svg
    .append("rect")
    .attr("class", "chart-overlay")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width)
    .attr("height", height)
    .on("mousemove", (event: MouseEvent) => updateTooltip(event))
    .on("mouseout", hideTooltip);

  /**
   * Handles click events to update focus indicators
   * and display the tooltip at the selected data point.
   *
   * @param event - The mouse event from the overlay.
   */
  function updateTooltip(event: MouseEvent): void {
    const [mouseX] = d3.pointer(event);
    const adjustedMouseX = mouseX - margin.left;

    const dClosest = findClosestDataPoint(adjustedMouseX);
    if (!dClosest) return;

    updateFocusIndicators(dClosest);
    positionTooltip(dClosest);
  }

  /**
   * Finds the closest data point to the given X mouse position.
   *
   * @param mouseX - The X coordinate of the mouse relative to the inner chart area.
   * @returns The closest data point or null if no point is found.
   */
  function findClosestDataPoint(mouseX: number): ProcessedEntry | null {
    const x0 = x.invert(mouseX);
    const i = bisectDate(data, x0, 1);
    const d0 = data[i - 1];
    const d1 = data[i];

    return !d0 || (d1 && x0 > d3.timeDay.offset(d0.date, 0.5)) ? d1 : d0;
  }

  /**
   * Updates the focus point (circle) and vertical line
   * on the chart to highlight the selected data point.
   *
   * @param d - The data point to focus on.
   */
  function updateFocusIndicators(d: ProcessedEntry): void {
    focusPoint
      .attr("cx", x(d.date))
      .attr("cy", y(d.value))
      .style("opacity", 1);

    focusLine
      .attr("x1", x(d.date))
      .attr("x2", x(d.date))
      .attr("y1", y(0))
      .attr("y2", y(d.value))
      .style("opacity", 1);
  }

  /**
   * Positions the tooltip relative to the chart container
   * with logic to flip horizontally and vertically if
   * the tooltip would otherwise overflow the visible area.
   *
   * @param d - The data point to display in the tooltip.
   */
  function positionTooltip(d: ProcessedEntry): void {
    const tooltipNode = tooltip.node() as HTMLElement | null;
    if (!tooltipNode) return;

    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;

    const container = document.querySelector(".chart-outer") as HTMLElement | null;
    if (!container) return;

    const pointX = x(d.date);
    const pointY = y(d.value);

    const visibleLeft = container.scrollLeft;
    const visibleRight = visibleLeft + container.clientWidth;

    let offsetX = pointX + 10;
    let offsetY = pointY - tooltipHeight - 10;

    if (pointX + tooltipWidth + 10 > visibleRight) {
      offsetX = pointX - tooltipWidth - 10;
    }

    if (offsetX < visibleLeft) {
      offsetX = visibleLeft + 5;
    }

    if (offsetY < 0) {
      offsetY = pointY + 10;
    }

    tooltip
      .attr("aria-hidden", "false")
      .classed("visible", true)
      .style("left", `${offsetX}px`)
      .style("top", `${offsetY}px`)
      .html(
        `${formatDate(d.date)}<br/>${formatNumberThousand(
          d.value
        )} RNA copies / L`
      );
  }

  /**
   * Hides the tooltip and focus indicators when the mouse
   * leaves the overlay area.
   */
  function hideTooltip(): void {
    tooltip
      .attr("aria-hidden", "true")
      .classed("visible", false);
    focusPoint.style("opacity", 0);
    focusLine.style("opacity", 0);
  }
}