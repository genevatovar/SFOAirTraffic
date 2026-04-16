// Calendar Heat Map - SFO Scrollytelling Project
// Dataset: sfo_enplaned_clean.csv
// Variable: passenger_count — monthly enplaned passengers
// Each row = one year, each cell = one month, color = passenger volume

function drawHeatmap(data) {
  // DIMENSIONS
  const cellW = 36, cellH = 18, gap = 3;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];

  // ORGANIZE DATA — roll up to year → month totals
  const monthlyMap = d3.rollup(
    data,
    v => d3.sum(v, d => d.passenger_count),
    d => d.year,
    d => d.month
  );

  const years = Array.from(monthlyMap.keys()).sort((a, b) => a - b);

  const margin = { top: 20, right: 30, bottom: 60, left: 50 };
  const width  = cellW * 12 + gap * 11 + margin.left + margin.right;
  const height = cellH * years.length + gap * (years.length - 1) + margin.top + margin.bottom;
  const plot_width  = width  - margin.left - margin.right;
  const plot_height = height - margin.top  - margin.bottom;

  // CANVAS AND PLOT
  const canvas = d3.select("#heatmap-container")
    .append("svg")
    .attr("width",  width)
    .attr("height", height);

  const plot = canvas.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // SCALES
  const allValues = [];
  years.forEach(y => {
    for (let m = 1; m <= 12; m++) {
      const v = (monthlyMap.get(y) || new Map()).get(m);
      if (v) allValues.push(v);
    }
  });

  const scaleColor = d3.scaleSequential()
    .domain([0, d3.max(allValues)])
    .interpolator(d3.interpolateBlues);

  // MONTH LABELS (top)
  monthNames.forEach((m, i) => {
    plot.append("text")
      .attr("x", i * (cellW + gap) + cellW / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("class", "axisLabel")
      .text(m);
  });

  // HEAT MAP CELLS
  years.forEach((year, yi) => {
    const rowY = yi * (cellH + gap);

    // Year label on left
    plot.append("text")
      .attr("x", -8)
      .attr("y", rowY + cellH / 2 + 4)
      .attr("text-anchor", "end")
      .attr("class", "axisLabel")
      .text(year);

    // One cell per month
    for (let m = 1; m <= 12; m++) {
      const val = (monthlyMap.get(year) || new Map()).get(m) || 0;
      const x   = (m - 1) * (cellW + gap);

      plot.append("rect")
        .attr("class", "heatmap-tile")
        .attr("x", x)
        .attr("y", rowY)
        .attr("width",  cellW)
        .attr("height", cellH)
        .attr("rx", 3)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("fill", val > 0 ? scaleColor(val) : "#eceae4");
    }
  });

  // COLOR LEGEND
  const legendWidth  = 200;
  const legendHeight = 12;
  const legendX = plot_width / 2 - legendWidth / 2;
  const legendY = plot_height + 30;

  const legendScale = d3.scaleLinear()
    .domain([0, d3.max(allValues)])
    .range([0, legendWidth]);

  const legend = plot.append("g")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  const defs = canvas.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "heatmap-gradient");

  const numStops = 10;
  for (let i = 0; i <= numStops; i++) {
    const t = i / numStops;
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", scaleColor(t * d3.max(allValues)));
  }

  legend.append("rect")
    .attr("width",  legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 2)
    .style("fill", "url(#heatmap-gradient)");

  legend.append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .attr("class", "axes")
    .call(
      d3.axisBottom(legendScale)
        .ticks(4)
        .tickFormat(d => (d / 1e6).toFixed(1) + "M")
    );

  legend.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", legendHeight + 30)
    .attr("text-anchor", "middle")
    .attr("class", "axisLabel")
    .text("Passengers per month");

  // TOOLTIP
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Transparent overlay rects for tooltip hit targets
  years.forEach((year, yi) => {
    const rowY = yi * (cellH + gap);
    for (let m = 1; m <= 12; m++) {
      const val = (monthlyMap.get(year) || new Map()).get(m) || 0;
      const x   = (m - 1) * (cellW + gap);
      if (!val) continue;

      plot.append("rect")
        .attr("x", x).attr("y", rowY)
        .attr("width", cellW).attr("height", cellH)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseover", function(e) {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(`<strong>${monthNames[m - 1]} ${year}</strong><br/>${d3.format(",.0f")(val)} passengers`)
            .style("left", (e.pageX + 12) + "px")
            .style("top",  (e.pageY - 28) + "px");
        })
        .on("mousemove", function(e) {
          tooltip
            .style("left", (e.pageX + 12) + "px")
            .style("top",  (e.pageY - 28) + "px");
        })
        .on("mouseout", function() {
          tooltip.transition().duration(200).style("opacity", 0);
        });
    }
  });
}

function loadAndDrawHeatmap() {
  d3.csv("sfo_enplaned_clean.csv", d => ({
    year:            +d.year,
    month:           +d.month,
    passenger_count: +d.passenger_count
  }))
  .then(function(data) {
    const validData = data.filter(d => d.year && d.month && !isNaN(d.passenger_count));
    drawHeatmap(validData);
  })
  .catch(err => {
    console.log("data loading error");
    console.log(err);
  });
}

loadAndDrawHeatmap();