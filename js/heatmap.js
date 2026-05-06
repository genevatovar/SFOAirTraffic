// Calendar Heat Map - SFO Scrollytelling Project
// Interactions: row highlight on hover, animated draw-in on scroll

function drawHeatmap(data) {
  const cellW = 48, cellH = 22, gap = 4;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];

  // Crisis periods — shaded bands with labels only, visual reference
  const crisisPeriods = [
    { label: "9/11",      years: [2001, 2002] },
    { label: "Recession", years: [2008, 2009] },
    { label: "COVID-19",  years: [2020, 2021] },
  ];

  // Annotations — key insights shown to the right of the chart
  const annotations = [
    { year: 2001, text: "9/11 collapses summer peak" },
    { year: 2008, text: "Recession dips begin" },
    { year: 2019, text: "Record high" },
    { year: 2020, text: "COVID wipes out nearly all traffic" },
    { year: 2022, text: "Recovery begins" },
  ];

  // Roll up to year → month totals
  const monthlyMap = d3.rollup(
    data,
    v => d3.sum(v, d => d.passenger_count),
    d => d.year,
    d => d.month
  );

  // Start at 2000 — 1999 data is partial
  // Exclude 2026 — year is incomplete
  const years = Array.from(monthlyMap.keys())
    .filter(y => y >= 2000 && y < 2026)
    .sort((a, b) => a - b);

  const margin = { top: 100, right: 240, bottom: 100, left: 60 };
  const width  = cellW * 12 + gap * 11 + margin.left + margin.right;
  const height = cellH * years.length + gap * (years.length - 1) + margin.top + margin.bottom;
  const plot_width  = width  - margin.left - margin.right;
  const plot_height = height - margin.top  - margin.bottom;

  const canvas = d3.select("#heatmap-container")
    .append("svg")
    .attr("width",  width)
    .attr("height", height);

  // ── Title and subtitle ─────────────────────────────────────────────────────
  canvas.append("text")
    .attr("x", margin.left + plot_width / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "700")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-75-white)")
    .text("Monthly Enplaned Passengers at SFO (2000–2025)");

  canvas.append("text")
    .attr("x", margin.left + plot_width / 2)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-50-white)")
    .text("Hover a row or month to highlight");

  const plot = canvas.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // ── Color scale — log scale makes subtle differences more visible ──────────
  const allValues = [];
  years.forEach(y => {
    for (let m = 1; m <= 12; m++) {
      const v = (monthlyMap.get(y) || new Map()).get(m);
      if (v && v > 0) allValues.push(v);
    }
  });

  const minVal = d3.min(allValues);
  const maxVal = d3.max(allValues);

  const scaleColor = d3.scaleSequential()
  .domain([0, maxVal])
  .interpolator(d3.interpolateBlues);

  // ── Crisis bands — drawn before cells so they sit underneath ──────────────
  crisisPeriods.forEach(crisis => {
    const crisisYearIndices = crisis.years
      .map(y => years.indexOf(y))
      .filter(i => i !== -1);
    if (!crisisYearIndices.length) return;

    const minYi = Math.min(...crisisYearIndices);
    const maxYi = Math.max(...crisisYearIndices);
    const bandY = minYi * (cellH + gap) - gap / 2;
    const bandH = (maxYi - minYi + 1) * (cellH + gap);

    plot.append("rect")
      .attr("class", "crisis-band")
      .attr("x", -4)
      .attr("y", bandY)
      .attr("width", plot_width + 8)
      .attr("height", bandH)
      .attr("rx", 3);

    plot.append("text")
      .attr("class", "crisis-label")
      .attr("x", plot_width + 10)
      .attr("y", bandY + bandH / 2 + 4)
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("font-family", "Montserrat, sans-serif")
      .text(crisis.label);
  });

  // ── Annotation excerpts — point left toward the graph ─────────────────────
  annotations.forEach(({ year, text }) => {
    const yi = years.indexOf(year);
    if (yi === -1) return;
    const rowY = yi * (cellH + gap) + cellH / 2 + 4;

    plot.append("text")
      .attr("x", plot_width + 12)
      .attr("y", rowY)
      .attr("text-anchor", "start")
      .style("font-size", "11px")
      .style("font-family", "Montserrat, sans-serif")
      .style("fill", "var(--sfo-50-white)")
      .style("font-style", "italic")
      .text(`← ${text}`);
  });

  // ── Cells ──────────────────────────────────────────────────────────────────
  years.forEach((year, yi) => {
    const rowY = yi * (cellH + gap);
    for (let m = 1; m <= 12; m++) {
      const val = (monthlyMap.get(year) || new Map()).get(m) || 0;
      const x   = (m - 1) * (cellW + gap);

      plot.append("rect")
        .attr("class", "heatmap-tile")
        .attr("data-year", year)
        .attr("data-month", m)
        .attr("x", x)
        .attr("y", rowY)
        .attr("width",  cellW)
        .attr("height", cellH)
        .attr("rx", 3)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("fill", val > 0 ? scaleColor(val) : "#eceae4")
        .style("opacity", 0)
        .style("cursor", "pointer");
    }
  });

  // ── Highlight / restore helpers ────────────────────────────────────────────
  function highlightYear(year) {
    plot.selectAll(".heatmap-tile")
      .transition().duration(150)
      .style("opacity", function() {
        return +this.getAttribute("data-year") === year ? 1 : 0.15;
      });
    plot.selectAll(".year-label")
      .filter(function() { return +this.getAttribute("data-year") === year; })
      .style("font-weight", "700")
      .style("fill", "#009ade");
  }

  function highlightMonth(month) {
    plot.selectAll(".heatmap-tile")
      .transition().duration(150)
      .style("opacity", function() {
        return +this.getAttribute("data-month") === month ? 1 : 0.15;
      });
    plot.selectAll(".month-label")
      .filter(function() { return +this.getAttribute("data-month") === month; })
      .style("font-weight", "700")
      .style("fill", "#009ade");
  }

  function restoreHighlight() {
    plot.selectAll(".heatmap-tile")
      .transition().duration(200)
      .style("opacity", 1);
    plot.selectAll(".year-label, .month-label")
      .style("font-weight", null)
      .style("fill", null);
  }

  // ── Month labels — with hover to highlight that column ────────────────────
  monthNames.forEach((name, i) => {
    const m = i + 1;
    const x = i * (cellW + gap) + cellW / 2;

    plot.append("text")
      .attr("x", x)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("class", "month-label axisLabel")
      .attr("data-month", m)
      .style("cursor", "pointer")
      .text(name);

    // Invisible rect above each month column as hit target
    plot.append("rect")
      .attr("x", i * (cellW + gap))
      .attr("y", -24)
      .attr("width", cellW)
      .attr("height", 20)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseover", function() { highlightMonth(m); })
      .on("mouseout",  function() { restoreHighlight(); });
  });

  // ── Year labels — pointer-events disabled, row rects handle hover ──────────
  years.forEach((year, yi) => {
    const rowY = yi * (cellH + gap);

    plot.append("text")
      .attr("x", -8)
      .attr("y", rowY + cellH / 2 + 4)
      .attr("text-anchor", "end")
      .attr("class", "year-label axisLabel")
      .attr("data-year", year)
      .style("pointer-events", "none")
      .text(year);
  });

  // ── Invisible full-row hit targets — covers year label area too ───────────
  years.forEach((year, yi) => {
    const rowY = yi * (cellH + gap);

    plot.append("rect")
      .attr("x", -margin.left)
      .attr("y", rowY - gap / 2)
      .attr("width", width)
      .attr("height", cellH + gap)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseover", function() { highlightYear(year); })
      .on("mouseout",  function() { restoreHighlight(); });
  });

  //  Tooltip — individual cell hover
  let tooltip = d3.select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }

  years.forEach((year, yi) => {
    const rowY = yi * (cellH + gap);
    for (let m = 1; m <= 12; m++) {
      const val = (monthlyMap.get(year) || new Map()).get(m) || 0;
      const x   = (m - 1) * (cellW + gap);

      plot.append("rect")
        .attr("x", x).attr("y", rowY)
        .attr("width", cellW).attr("height", cellH)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseover", function(e) {
          if (!val) return;
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

  // COLOR LEGEND
  const legendWidth  = 200;
  const legendHeight = 12;
  const legendX = plot_width / 2 - legendWidth / 2;
  const legendY = plot_height + 36;

  const legend = plot.append("g")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  const defs = canvas.append("defs");
  const gradient = defs.append("linearGradient").attr("id", "heatmap-gradient");

  // Gradient goes from minVal to 3M so bar reaches full dark blue
  for (let i = 0; i <= 10; i++) {
  const t = i / 10;
  gradient.append("stop")
    .attr("offset", `${t * 100}%`)
    .attr("stop-color", scaleColor(t * 3e6));
  }

  // Gradient bar
  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 2)
    .style("fill", "url(#heatmap-gradient)");

  // Legend title above the bar
  legend.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", -6)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-50-white)")
    .text("Passengers per month");

  // D3 axis with clean round ticks
  const legendScale = d3.scaleLinear()
    .domain([0, 3e6])
    .range([0, legendWidth]);

  legend.append("g")
  .attr("transform", `translate(0, ${legendHeight})`)
  .attr("class", "axes")
  .call(
    d3.axisBottom(legendScale)
      .tickValues([0, 1e6, 2e6, 3e6])
      .tickFormat(d => (d / 1e6).toFixed(1) + "M")
      .tickSize(6)
  )
  .selectAll("text")
  .style("fill", "#c1eafb")
  .style("font-size", "10px");

  // Hide the domain bar, keep tick lines
  legend.select(".axes .domain").style("display", "none");
  legend.selectAll(".axes .tick line").style("stroke", "#c1eafb");

  // "Darker = more passengers" below the axis
  legend.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", legendHeight + 36)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-50-white)")
    .text("Darker = more passengers");

  // ── Scroll-triggered draw-in — re-animates every scroll entry ─────────────
  const container = document.querySelector("#heatmap-container");

  const drawObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        plot.selectAll(".heatmap-tile").style("opacity", 0);
        for (let m = 1; m <= 12; m++) {
          setTimeout(() => {
            plot.selectAll(".heatmap-tile")
              .filter(function() { return +this.getAttribute("data-month") === m; })
              .transition().duration(400)
              .style("opacity", 1);
          }, (m - 1) * 80);
        }
      }
    });
  }, { threshold: 0.2 });

  drawObserver.observe(container);
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
    console.log("data loading error", err);
  });
}

loadAndDrawHeatmap();