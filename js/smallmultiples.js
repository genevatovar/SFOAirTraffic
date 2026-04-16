// Small Multiples of Lines - SFO Scrollytelling Project
// Dataset: sfo_enplaned_clean.csv
// Layout: 1 column × 2 rows (2 panels)
// X-axis: Date (monthly, 1999–2026, shared domain)
// Y-axis: Passenger count (shared domain across both panels for direct comparison)
// Panels: Domestic and International
// Color scale: qualitative (blue for Domestic, teal for International)

function drawSmallMultiples(data) {
  const COLS = 1, ROWS = 2;

  const cellW = 680, cellH = 220;
  const cellMargin = { top: 36, right: 24, bottom: 44, left: 70 };
  const panelW = cellW - cellMargin.left - cellMargin.right;
  const panelH = cellH - cellMargin.top  - cellMargin.bottom;

  const outerMargin = { top: 72, right: 20, bottom: 50, left: 20 };
  const svgW = COLS * cellW + outerMargin.left + outerMargin.right;
  const svgH = ROWS * cellH + outerMargin.top  + outerMargin.bottom;

  // CANVAS
  const canvas = d3.select("#smallmultiples-container")
    .append("svg")
    .attr("width",  svgW)
    .attr("height", svgH);

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

  // SCALES (shared across panels for direct comparability)
  const xExtent = d3.extent(flat, d => d.date);
  const yMax    = d3.max(flat,  d => d.passengers);

  const xScale = d3.scaleTime()
    .domain(xExtent)
    .range([0, panelW]);

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

  // Crisis bands — 9/11 and COVID
  const crisisBands = [
    { start: new Date(2001, 8, 1), end: new Date(2002, 6, 1), label: "9/11" },
    { start: new Date(2020, 0, 1), end: new Date(2021, 9, 1), label: "COVID-19" }
  ];

  // TOOLTIP
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];

  // DRAW PANELS — one per segment
  segments.forEach((geo, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const tx  = outerMargin.left + col * cellW + cellMargin.left;
    const ty  = outerMargin.top  + row * cellH  + cellMargin.top;

    const seriesData = flat.filter(d => d.geo === geo)
      .sort((a, b) => a.date - b.date);

    const panel = canvas.append("g")
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

    // Crisis band shading
    crisisBands.forEach(b => {
      const x0 = xScale(b.start);
      const x1 = xScale(b.end);
      panel.append("rect")
        .attr("class", "crisis-band")
        .attr("x", x0).attr("y", 0)
        .attr("width",  x1 - x0)
        .attr("height", panelH);

      panel.append("text")
        .attr("class", "crisis-label")
        .attr("x", (x0 + x1) / 2)
        .attr("y", -4)
        .attr("text-anchor", "middle")
        .text(b.label);
    });

    // Filled area
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
      .style("stroke-width", 1.8)
      .style("fill", "none");

    // X axis
    panel.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${panelH})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.timeFormat("%Y")));

    // Y axis
    panel.append("g")
      .attr("class", "axis y-axis")
      .call(
        d3.axisLeft(yScale)
          .ticks(4)
          .tickFormat(d => d >= 1e6 ? (d / 1e6).toFixed(1) + "M" : (d / 1e3).toFixed(0) + "K")
      );

    // Panel title (segment name, colored)
    panel.append("text")
      .attr("x", panelW / 2)
      .attr("y", -14)
      .attr("text-anchor", "middle")
      .attr("class", "panel-title")
      .style("fill", colors[geo])  // data-driven color, keep inline
      .text(geo);

    // Invisible overlay for bisect tooltip
    panel.append("rect")
      .attr("width", panelW)
      .attr("height", panelH)
      .style("fill", "transparent")
      .on("mousemove", function(e) {
        const [mx] = d3.pointer(e);
        const hoverDate = xScale.invert(mx);
        const bisect = d3.bisector(d => d.date).left;
        const idx = bisect(seriesData, hoverDate, 1);
        const d = seriesData[Math.min(idx, seriesData.length - 1)];
        if (!d) return;
        tooltip.transition().duration(100).style("opacity", 0.9);
        tooltip
          .html(`<strong>${geo}</strong><br/>${monthNames[d.month - 1]} ${d.year}<br/>${d3.format(",.0f")(d.passengers)} passengers`)
          .style("left", (e.pageX + 12) + "px")
          .style("top",  (e.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition().duration(200).style("opacity", 0);
      });
  });

  // SHARED AXIS LABELS
  const panelAreaCenterX = outerMargin.left + (COLS * cellW) / 2;
  const panelAreaCenterY = outerMargin.top  + (ROWS * cellH) / 2;

  canvas.append("text")
    .attr("class", "axisLabel")
    .attr("x", panelAreaCenterX)
    .attr("y", outerMargin.top + ROWS * cellH + 32)
    .attr("text-anchor", "middle")
    .text("Year");

  canvas.append("text")
    .attr("class", "axisLabel")
    .attr("transform", "rotate(-90)")
    .attr("x", -panelAreaCenterY)
    .attr("y", 14)
    .attr("text-anchor", "middle")
    .text("Passengers per month");
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
  })
  .catch(err => {
    console.log("data loading error");
    console.log(err);
  });
}

loadAndDrawSmallMultiples();