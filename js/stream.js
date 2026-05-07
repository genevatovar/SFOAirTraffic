// Streamgraph - SFO Scrollytelling Project
// Dataset: sfo_enplaned_clean.csv
// X-axis: Year (2000–2025)
// Y-axis: Annual enplaned passengers (stackOffsetNone — absolute volumes)
// Series: Top 6 airlines by all-time passenger count + "Other"
// Color scale: Qualitative (d3.schemeTableau10)
// Interactions: hover to isolate stream, scroll-triggered left-to-right draw-in,
//               crosshair tooltip

function drawStream(data) {
  const container = document.getElementById("streamgraph-container");
  const width = container.clientWidth || 900;
  const isMobile = width < 500;
  const height = Math.round(width * (isMobile ? 0.75 : 0.54));
  const margin = {
    top:    isMobile ? 70  : 90,
    right:  isMobile ? 10  : 180,
    bottom: isMobile ? 50  : 80,
    left:   isMobile ? 48  : 70
  };
  const plot_width  = width  - margin.left - margin.right;
  const plot_height = height - margin.top  - margin.bottom;

  const canvas = d3.select("#streamgraph-container")
    .append("svg")
    .attr("width",  width)
    .attr("height", height);

  const plot = canvas.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ── Title and subtitle ─────────────────────────────────────────────────────
  canvas.append("text")
    .attr("x", margin.left + plot_width / 2)
    .attr("y", isMobile ? 18 : 24)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "12px" : "16px")
    .style("font-weight", "700")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-75-white)")
    .text("Annual Enplaned Passengers by Airline at SFO (2000–2025)");

  canvas.append("text")
    .attr("x", margin.left + plot_width / 2)
    .attr("y", isMobile ? 34 : 46)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "10px" : "12px")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-50-white)")
    .text(isMobile ? "Tap legend to isolate airline" : "Hover over the color legend to isolate an airline");

  // ORGANIZE DATA — annual totals per airline
  const annualAirline = d3.rollup(
    data,
    v => d3.sum(v, d => d.passenger_count),
    d => d.airline,
    d => d.year
  );

  // Top 6 airlines by all-time total
  const topAirlines = Array.from(
    d3.rollup(data, v => d3.sum(v, d => d.passenger_count), d => d.airline),
    ([airline, total]) => ({ airline, total })
  ).sort((a, b) => b.total - a.total)
   .slice(0, 6)
   .map(d => d.airline);

  const keys = [...topAirlines, "Other"];

  // Filter to 2000–2025 — excludes partial years at either end
  const allYears = [...new Set(data.map(d => d.year))]
    .filter(y => y >= 2000 && y <= 2025)
    .sort(d3.ascending);

  // Wide format for d3.stack()
  const wideData = allYears.map(year => {
    const row = { year };
    let topTotal = 0;

    topAirlines.forEach(airline => {
      const v = (annualAirline.get(airline) || new Map()).get(year) || 0;
      row[airline] = v;
      topTotal += v;
    });

    // All passengers that year across every airline
    const allYear = Array.from(annualAirline.values())
      .reduce((sum, yMap) => sum + (yMap.get(year) || 0), 0);
    row["Other"] = Math.max(0, allYear - topTotal);

    return row;
  });

  // STACK — stackOffsetNone for absolute volumes (not wiggle)
  // stackOrderNone preserves key order so top airline stays at bottom
  const stack = d3.stack()
    .keys(keys)
    .offset(d3.stackOffsetNone)
    .order(d3.stackOrderNone);

  const stackedData = stack(wideData);

  // SCALES — fixed domain 2000–2025
  const xScale = d3.scaleLinear()
    .domain([2000, 2025])
    .range([0, plot_width]);

  const yMax = d3.max(stackedData, layer => d3.max(layer, d => d[1]));
  const yScale = d3.scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([plot_height, 0]);

  // Qualitative color scale — Tableau10
  const colorScale = d3.scaleOrdinal()
    .domain(keys)
    .range(d3.schemeTableau10);

  // AREA GENERATOR
  const areaGen = d3.area()
    .x(d => xScale(d.data.year))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]))
    .curve(d3.curveCatmullRom);

  // Crisis bands — 9/11, recession, and COVID
  // Drawn before streams so they sit underneath
  const crisisBands = [
    { start: 2001.5, end: 2002.5, label: "9/11" },
    { start: 2008.5, end: 2010,   label: "Recession" },
    { start: 2020,   end: 2021.8, label: "COVID-19" }
  ];

  crisisBands.forEach(b => {
    plot.append("rect")
      .attr("class", "crisis-band")
      .attr("x", xScale(b.start)).attr("y", 0)
      .attr("width",  xScale(b.end) - xScale(b.start))
      .attr("height", plot_height);

    plot.append("text")
      .attr("class", "crisis-label")
      .attr("x", (xScale(b.start) + xScale(b.end)) / 2)
      .attr("y", -4)
      .attr("text-anchor", "middle")
      .style("font-size", isMobile ? "8px" : "9px")
      .text(b.label);
  });

  // ── Draw streams — start clipped to x=0 for draw-in animation ────────────
  // Clip path restricts visible area; animation expands it left to right
  const clipId = "stream-clip";

  canvas.append("defs").append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0)
    .attr("height", height);

  // DRAW STREAMS
  stackedData.forEach(layer => {
    plot.append("path")
      .datum(layer)
      .attr("class", "area-path")
      .attr("data-key", layer.key)
      .attr("d", areaGen)
      .attr("clip-path", `url(#${clipId})`)
      .style("fill", colorScale(layer.key))
      .style("fill-opacity", 0.85)
      .style("stroke", "white")
      .style("stroke-width", 0.5)
      .style("cursor", "pointer");
  });

  // ── Hover isolation — dims all streams except the hovered one ─────────────
  function isolateStream(key) {
    plot.selectAll(".area-path")
      .transition().duration(200)
      .style("fill-opacity", function() {
        return this.getAttribute("data-key") === key ? 0.95 : 0.15;
      });
  }

  function restoreStreams() {
    plot.selectAll(".area-path")
      .transition().duration(200)
      .style("fill-opacity", 0.85);
  }

  // TOOLTIP — reuse existing to avoid duplicates
  let tooltip = d3.select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }

  // Vertical crosshair line
  const crosshair = plot.append("line")
    .attr("class", "crosshair")
    .attr("y1", 0).attr("y2", plot_height)
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Invisible overlay rect — captures mouse for crosshair and tooltip
  plot.append("rect")
    .attr("width", plot_width)
    .attr("height", plot_height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mousemove touchmove", function(e) {
      const eventX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect   = this.getBoundingClientRect();
      const mx     = eventX - rect.left;
      const year = Math.round(xScale.invert(mx));

      // Snap to nearest actual year in data
      const nearestYear = allYears.reduce((prev, curr) =>
        Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev
      );

      crosshair
        .attr("x1", xScale(nearestYear))
        .attr("x2", xScale(nearestYear))
        .style("opacity", 1);

      // Build tooltip rows for each key at this year
      const rows = keys.map(airline => {
        const val = airline === "Other"
          ? wideData.find(d => d.year === nearestYear)?.["Other"] || 0
          : (annualAirline.get(airline) || new Map()).get(nearestYear) || 0;
        const color = colorScale(airline);
        return `<span style="color:${color}; font-weight:600">${airline}</span>: ${d3.format(",.0f")(val)}`;
      }).join("<br/>");

      const px = e.touches ? e.touches[0].pageX : e.pageX;
      const py = e.touches ? e.touches[0].pageY : e.pageY;

      tooltip.style("opacity", 0.95)
        .html(`<strong>${nearestYear}</strong><br/>${rows}`)
        .style("left", (px + 14) + "px")
        .style("top",  (py - 36) + "px");
    })
    .on("mouseleave touchend", function() {
      crosshair.style("opacity", 0);
      tooltip.style("opacity", 0);
      restoreStreams();
    });

  // AXES
  plot.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${plot_height})`)
    .call(d3.axisBottom(xScale).ticks(isMobile ? 6 : 10).tickFormat(d3.format("d")));

  plot.append("g")
    .attr("class", "axis y-axis")
    .call(
      d3.axisLeft(yScale)
        .ticks(isMobile ? 4 : 6)
        .tickFormat(d => d >= 1e6 ? (d / 1e6).toFixed(0) + "M" : "")
    );

  // AXIS LABELS
  if (!isMobile) {
    plot.append("text")
      .attr("class", "axisLabel")
      .attr("x", plot_width / 2)
      .attr("y", plot_height + 55)
      .attr("text-anchor", "middle")
      .text("Year");

    plot.append("text")
      .attr("class", "axisLabel")
      .attr("transform", "rotate(-90)")
      .attr("x", -plot_height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .text("Annual enplaned passengers");
  }

  // LEGEND — hover isolates stream, mouseout restores all
  // On mobile: compact inline legend below the chart with tap support
  if (isMobile) {
    const legendSvgH = keys.length * 22 + 30;
    canvas.attr("height", height + legendSvgH);

    const legendG = canvas.append("g")
      .attr("transform", `translate(${margin.left}, ${height - 10})`);

    legendG.append("text")
      .attr("x", 0).attr("y", 14)
      .attr("class", "legend-title")
      .style("font-size", "11px")
      .style("fill", "var(--sfo-75-white)")
      .text("Airline");

    keys.forEach((k, i) => {
      const row = legendG.append("g")
        .attr("transform", `translate(0, ${24 + i * 22})`)
        .style("cursor", "pointer")
        .on("click touchend", function() { isolateStream(k); });

      row.append("rect")
        .attr("class", "legend-swatch")
        .attr("width", 14).attr("height", 14)
        .attr("rx", 2)
        .style("fill", colorScale(k))
        .style("fill-opacity", 0.85);

      row.append("text")
        .attr("class", "legend-label")
        .attr("x", 20).attr("y", 11)
        .style("font-size", "11px")
        .style("fill", "var(--sfo-75-white)")
        .text(k.length > 22 ? k.slice(0, 22) + "…" : k);
    });

  } else {
    const legendG = canvas.append("g")
      .attr("transform", `translate(${margin.left + plot_width + 20}, ${margin.top + 20})`);

    legendG.append("text")
      .attr("x", 0).attr("y", 0)
      .attr("class", "legend-title")
      .text("Airline");

    keys.forEach((k, i) => {
      const row = legendG.append("g")
        .attr("transform", `translate(0, ${20 + i * 26})`)
        .style("cursor", "pointer")
        .on("mouseover", function() { isolateStream(k); })
        .on("mouseout",  function() { restoreStreams(); });

      row.append("rect")
        .attr("class", "legend-swatch")
        .attr("width", 16).attr("height", 16)
        .attr("rx", 2)
        .style("fill", colorScale(k))
        .style("fill-opacity", 0.85);

      row.append("text")
        .attr("class", "legend-label")
        .attr("x", 24).attr("y", 12)
        .text(k.length > 18 ? k.slice(0, 18) + "…" : k);
    });
  }

  // ── Scroll-triggered left-to-right draw-in animation ─────────────────────
  // IntersectionObserver expands clip rect when section enters viewport
  const streamContainer = document.querySelector("#streamgraph-container");

  const drawObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        canvas.select(`#${clipId} rect`)
          .transition()
          .duration(2000)
          .ease(d3.easeQuadInOut)
          .attr("width", plot_width + margin.left + margin.right);

        drawObserver.unobserve(streamContainer);  // only animate once
      }
    });
  }, { threshold: 0.2 });

  drawObserver.observe(streamContainer);
}

function loadAndDrawStream() {
  d3.csv("sfo_enplaned_clean.csv", d => ({
    year:            +d.year,
    airline:         d.airline,
    passenger_count: +d.passenger_count
  }))
  .then(function(data) {
    const validData = data.filter(d =>
      d.year && d.airline && !isNaN(d.passenger_count)
    );
    drawStream(validData);

    // Redraw on resize
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        d3.select("#streamgraph-container svg").remove();
        drawStream(validData);
      }, 250);
    });
  })
  .catch(err => {
    console.log("data loading error", err);
  });
}

loadAndDrawStream();