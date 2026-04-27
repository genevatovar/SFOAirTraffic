// Streamgraph - SFO Scrollytelling Project
// Dataset: sfo_enplaned_clean.csv
// X-axis: Year (1999–2026)
// Y-axis: Annual enplaned passengers (stackOffsetNone — absolute volumes)
// Series: Top 6 airlines by all-time passenger count + "Other"
// Color scale: Qualitative (d3.schemeTableau10)
// Tooltip: vertical crosshair via bisect

function drawStream(data) {
  const container = document.getElementById("streamgraph-container");
  const width = container.clientWidth || 900;
  const height = Math.round(width * 0.54);
  const margin = { top: 70, right: 180, bottom: 80, left: 60 };
  const plot_width  = width  - margin.left - margin.right;
  const plot_height = height - margin.top  - margin.bottom;

  const canvas = d3.select("#streamgraph-container")
    .append("svg")
    .attr("width",  width)
    .attr("height", height);

  const plot = canvas.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

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

  // All years in dataset
  const allYears = [...new Set(data.map(d => d.year))].sort(d3.ascending);

  // Wide format for d3.stack(): [{year, United: val, Alaska: val, ..., Other: val}]
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

  // SCALES
  const xScale = d3.scaleLinear()
    .domain(d3.extent(allYears))
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

  // Crisis bands — 9/11 and COVID
  const crisisBands = [
    { start: 2001.5, end: 2002.5, label: "9/11" },
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
      .text(b.label);
  });

  // DRAW STREAMS
  stackedData.forEach(layer => {
    plot.append("path")
      .datum(layer)
      .attr("class", "area-path")
      .attr("d", areaGen)
      .style("fill", colorScale(layer.key))  // data-driven color, keep inline
      .style("fill-opacity", 0.85)
      .style("stroke", "white")
      .style("stroke-width", 0.5);
  });

  // TOOLTIP + CROSSHAIR
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Vertical crosshair line
  const crosshair = plot.append("line")
    .attr("class", "crosshair")
    .attr("y1", 0).attr("y2", plot_height)
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Invisible overlay rect to capture mouse events
  plot.append("rect")
    .attr("width", plot_width)
    .attr("height", plot_height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mousemove", function(e) {
      const [mx] = d3.pointer(e);
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

      tooltip.style("opacity", 0.95)
        .html(`<strong>${nearestYear}</strong><br/>${rows}`)
        .style("left", (e.pageX + 14) + "px")
        .style("top",  (e.pageY - 36) + "px");
    })
    .on("mouseleave", function() {
      crosshair.style("opacity", 0);
      tooltip.style("opacity", 0);
    });

  // AXES
  plot.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${plot_height})`)
    .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.format("d")));

  plot.append("g")
    .attr("class", "axis y-axis")
    .call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat(d => d >= 1e6 ? (d / 1e6).toFixed(0) + "M" : "")
    );

  // AXIS LABELS
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

  // LEGEND
  const legendG = canvas.append("g")
    .attr("transform", `translate(${margin.left + plot_width + 20}, ${margin.top + 20})`);

  legendG.append("text")
    .attr("x", 0).attr("y", 0)
    .attr("class", "legend-title")
    .text("Airline");

  keys.forEach((k, i) => {
    const row = legendG.append("g")
      .attr("transform", `translate(0, ${20 + i * 26})`);

    row.append("rect")
      .attr("class", "legend-swatch")
      .attr("width", 16).attr("height", 16)
      .attr("rx", 2)
      .style("fill", colorScale(k))  // data-driven color, keep inline
      .style("fill-opacity", 0.85);

    row.append("text")
      .attr("class", "legend-label")
      .attr("x", 24).attr("y", 12)
      .text(k.length > 18 ? k.slice(0, 18) + "…" : k);
  });
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
  })
  .catch(err => {
    console.log("data loading error");
    console.log(err);
  });
}

loadAndDrawStream();