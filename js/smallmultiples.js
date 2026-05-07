// Small Multiples of Lines - SFO Scrollytelling Project
// Dataset: sfo_enplaned_clean.csv
// Layout: 1 column × 2 rows (2 panels)
// X-axis: Date (monthly, 2000–2025, shared domain)
// Y-axis: Passenger count (shared domain across both panels for direct comparison)
// Panels: Domestic and International
// Color scale: qualitative (blue for Domestic, teal for International)
// Annotations: pinned to top of panel with dashed vertical lines to avoid overlap

function drawSmallMultiples(data) {
  const COLS = 1, ROWS = 2;

  // Responsive sizing — derive panel dimensions from container width
  const containerEl = document.getElementById("smallmultiples-container");
  const containerW  = containerEl.clientWidth || 860;
  const isMobile    = containerW < 500;

  // Larger panels for better readability
  const cellW = containerW;
  const cellH = isMobile ? 200 : 280;
  const cellMargin = {
    top:    isMobile ? 36 : 50,
    right:  isMobile ? 16 : 40,
    bottom: isMobile ? 40 : 50,
    left:   isMobile ? 52 : 80
  };
  const panelW = cellW - cellMargin.left - cellMargin.right;
  const panelH = cellH - cellMargin.top  - cellMargin.bottom;

  const outerMargin = {
    top:    isMobile ? 60 : 90,
    right:  0,
    bottom: isMobile ? 40 : 60,
    left:   0
  };
  const svgW = cellW;
  const svgH = ROWS * cellH + outerMargin.top + outerMargin.bottom;

  // CANVAS
  const canvas = d3.select("#smallmultiples-container")
    .append("svg")
    .attr("width",  svgW)
    .attr("height", svgH);

  // TITLE AND SUBTITLE
  canvas.append("text")
    .attr("x", cellMargin.left + panelW / 2)
    .attr("y", isMobile ? 18 : 28)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "12px" : "16px")
    .style("font-weight", "700")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-75-white)")
    .text("Monthly Passengers at SFO: Domestic vs. International (2000–2025)");

  canvas.append("text")
    .attr("x", cellMargin.left + panelW / 2)
    .attr("y", isMobile ? 34 : 50)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "10px" : "12px")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-50-white)")
    .text(isMobile
      ? "Tap to compare traffic"
      : "Hover over either panel to compare domestic and international traffic for the same month");

  // ORGANIZE DATA — monthly totals per geo_summary
  const segments = ["Domestic", "International"];
  const colors   = { Domestic: "#378ADD", International: "#1D9E75" };

  // Flatten to {geo, date, passengers}
  const monthlyGeo = d3.rollup(
    data,
    v => d3.sum(v, d => d.passenger_count),
    d => d.geo_summary,
    d => d.year,
    d => d.month
  );

  const flat = [];
  segments.forEach(geo => {
    const yMap = monthlyGeo.get(geo) || new Map();
    yMap.forEach((mMap, year) => {
      mMap.forEach((passengers, month) => {
        flat.push({ geo, year, month, passengers,
          date: new Date(year, month - 1, 1) });
      });
    });
  });

  // SCALES — fixed domain 2000–2025, shared across panels
  const xScale = d3.scaleTime()
    .domain([new Date(2000, 0, 1), new Date(2025, 11, 1)])
    .range([0, panelW]);

  const yMax = d3.max(flat, d => d.passengers);
  const yScale = d3.scaleLinear()
    .domain([0, yMax * 1.05])
    .nice()
    .range([panelH, 0]);

  // LINE + AREA GENERATORS (shared)
  const lineGen = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.passengers))
    .defined(d => !isNaN(d.passengers))
    .curve(d3.curveMonotoneX);

  const areaGen = d3.area()
    .x(d => xScale(d.date))
    .y0(panelH)
    .y1(d => yScale(d.passengers))
    .defined(d => !isNaN(d.passengers))
    .curve(d3.curveMonotoneX);

  // Crisis bands — same dates as heatmap for cross-view consistency
  const crisisBands = [
    { start: new Date(2001, 8, 1), end: new Date(2002, 6, 1), label: "9/11" },
    { start: new Date(2008, 8, 1), end: new Date(2009, 5, 1), label: "Recession" },
    { start: new Date(2020, 0, 1), end: new Date(2021, 9, 1), label: "COVID-19" }
  ];

  // TOOLTIP — reuse existing to avoid duplicates
  let tooltip = d3.select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];

  // Store panel refs for crosshair sync
  const panelRefs = [];

  // DRAW PANELS — one per segment
  segments.forEach((geo, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const tx  = cellMargin.left;
    const ty  = outerMargin.top + row * cellH + cellMargin.top;

    const seriesData = flat
      .filter(d => d.geo === geo && d.year >= 2000 && d.year <= 2025)
      .sort((a, b) => a.date - b.date);

    const panel = canvas.append("g")
      .attr("class", "sm-panel")
      .attr("data-geo", geo)
      .attr("transform", `translate(${tx},${ty})`);

    // Panel background
    panel.append("rect")
      .attr("class", "panel-bg")
      .attr("width",  panelW)
      .attr("height", panelH);

    // Gridlines
    panel.append("g")
      .attr("class", "gridline")
      .selectAll("line")
      .data(yScale.ticks(4))
      .join("line")
      .attr("x1", 0).attr("x2", panelW)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d));

    // Crisis band shading — drawn before line so they sit underneath
    crisisBands.forEach(b => {
      const x0 = xScale(b.start);
      const x1 = xScale(b.end);
      panel.append("rect")
        .attr("class", "crisis-band")
        .attr("x", x0).attr("y", 0)
        .attr("width",  x1 - x0)
        .attr("height", panelH);

      // Only label on first panel to avoid duplication
      if (i === 0) {
        panel.append("text")
          .attr("class", "crisis-label")
          .attr("x", (x0 + x1) / 2)
          .attr("y", -6)
          .attr("text-anchor", "middle")
          .style("font-size", isMobile ? "8px" : "9px")
          .text(b.label);
      }
    });

    // Filled area under line
    panel.append("path")
      .datum(seriesData)
      .attr("d", areaGen)
      .style("fill", colors[geo])
      .style("fill-opacity", 0.12);

    // Line
    panel.append("path")
      .datum(seriesData)
      .attr("class", "line-path")
      .attr("d", lineGen)
      .style("stroke", colors[geo])
      .style("stroke-width", isMobile ? 1.2 : 1.8)
      .style("fill", "none");

    // X axis
    panel.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${panelH})`)
      .call(d3.axisBottom(xScale).ticks(isMobile ? 5 : 10).tickFormat(d3.timeFormat("%Y")));

    // Y axis
    panel.append("g")
      .attr("class", "axis y-axis")
      .call(
        d3.axisLeft(yScale)
          .ticks(isMobile ? 3 : 4)
          .tickFormat(d => d >= 1e6 ? (d / 1e6).toFixed(1) + "M" : (d / 1e3).toFixed(0) + "K")
      );

    // Panel title
    panel.append("text")
      .attr("x", panelW / 2)
      .attr("y", isMobile ? -14 : -20)
      .attr("text-anchor", "middle")
      .attr("class", "panel-title")
      .style("font-size", isMobile ? "11px" : "13px")
      .style("font-weight", "700")
      .style("fill", colors[geo])
      .text(geo);

    // Invisible overlay — handles hover + crosshair sync
    // Sits on top of everything so it captures all mouse events
    panel.append("rect")
      .attr("width", panelW)
      .attr("height", panelH)
      .style("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mousemove touchmove", function(e) {
        const eventX    = e.touches ? e.touches[0].clientX : e.clientX;
        const rect      = this.getBoundingClientRect();
        const mx        = eventX - rect.left;
        const hoverDate = xScale.invert(mx);
        const bisector  = d3.bisector(d => d.date).left;

        // Sync crosshair across both panels at the same date
        panelRefs.forEach(ref => {
          const idx = Math.min(bisector(ref.seriesData, hoverDate, 1), ref.seriesData.length - 1);
          const d = ref.seriesData[idx];
          if (!d) return;
          ref.crosshairLine
            .attr("x1", xScale(d.date)).attr("x2", xScale(d.date))
            .style("display", null);
          ref.dotMarker
            .attr("cx", xScale(d.date)).attr("cy", yScale(d.passengers))
            .style("display", null);
        });

        // Tooltip shows both domestic + international for the hovered month
        const domRef  = panelRefs.find(r => r.geo === "Domestic");
        const intlRef = panelRefs.find(r => r.geo === "International");
        const domD  = domRef.seriesData[Math.min(bisector(domRef.seriesData, hoverDate, 1), domRef.seriesData.length - 1)];
        const intlD = intlRef.seriesData[Math.min(bisector(intlRef.seriesData, hoverDate, 1), intlRef.seriesData.length - 1)];
        if (!domD || !intlD) return;

        const px = e.touches ? e.touches[0].pageX : e.pageX;
        const py = e.touches ? e.touches[0].pageY : e.pageY;

        tooltip.transition().duration(100).style("opacity", 0.9);
        tooltip
          .html(`
            <strong>${monthNames[domD.month - 1]} ${domD.year}</strong><br/>
            <span style="color:#378ADD">▬ Domestic: ${d3.format(",.0f")(domD.passengers)}</span><br/>
            <span style="color:#1D9E75">▬ International: ${d3.format(",.0f")(intlD.passengers)}</span>
          `)
          .style("left", (px + 12) + "px")
          .style("top",  (py - 28) + "px");
      })
      .on("mouseout touchend", function() {
        // Hide crosshairs on all panels on mouse leave
        panelRefs.forEach(ref => {
          ref.crosshairLine.style("display", "none");
          ref.dotMarker.style("display", "none");
        });
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Crosshair elements — appended after overlay so they render on top
    const crosshairLine = panel.append("line")
      .attr("class", "crosshair")
      .attr("y1", 0)
      .attr("y2", panelH)
      .style("display", "none");

    const dotMarker = panel.append("circle")
      .attr("r", isMobile ? 3 : 4)
      .style("fill", colors[geo])
      .style("stroke", "white")
      .style("stroke-width", 1.5)
      .style("display", "none");

    panelRefs.push({ geo, seriesData, crosshairLine, dotMarker });
  });

  // SHARED AXIS LABELS
  if (!isMobile) {
    const panelAreaCenterX = cellMargin.left + panelW / 2;
    const panelAreaCenterY = outerMargin.top  + (ROWS * cellH) / 2;

    canvas.append("text")
      .attr("class", "axisLabel")
      .attr("x", panelAreaCenterX)
      .attr("y", outerMargin.top + ROWS * cellH + 42)
      .attr("text-anchor", "middle")
      .text("Year");

    canvas.append("text")
      .attr("class", "axisLabel")
      .attr("transform", "rotate(-90)")
      .attr("x", -panelAreaCenterY)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .text("Passengers per month");
  }
}

function loadAndDrawSmallMultiples() {
  d3.csv("sfo_enplaned_clean.csv", d => ({
    year:            +d.year,
    month:           +d.month,
    geo_summary:     d.geo_summary,
    passenger_count: +d.passenger_count
  }))
  .then(function(data) {
    const validData = data.filter(d =>
      d.year && d.month && d.geo_summary && !isNaN(d.passenger_count)
    );
    drawSmallMultiples(validData);

    // Redraw on resize
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        d3.select("#smallmultiples-container svg").remove();
        drawSmallMultiples(validData);
      }, 250);
    });
  })
  .catch(err => {
    console.log("data loading error", err);
  });
}

loadAndDrawSmallMultiples();