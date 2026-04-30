// Calendar Heat Map - SFO Scrollytelling Project
// Interactions: row highlight, crisis zoom, animated draw-in on scroll

function drawHeatmap(data) {
  const cellW = 36, cellH = 18, gap = 3;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];

  // Crisis periods for click-to-zoom
  const crisisPeriods = [
    { label: "9/11",      years: [2001, 2002] },
    { label: "Recession", years: [2008, 2009] },
    { label: "COVID-19",  years: [2020, 2021] },
  ];

  const monthlyMap = d3.rollup(
    data,
    v => d3.sum(v, d => d.passenger_count),
    d => d.year,
    d => d.month
  );

  const years = Array.from(monthlyMap.keys()).sort((a, b) => a - b);

  const margin = { top: 40, right: 80, bottom: 80, left: 50 };
  const width  = cellW * 12 + gap * 11 + margin.left + margin.right;
  const height = cellH * years.length + gap * (years.length - 1) + margin.top + margin.bottom;
  const plot_width  = width  - margin.left - margin.right;
  const plot_height = height - margin.top  - margin.bottom;

  const canvas = d3.select("#heatmap-container")
    .append("svg")
    .attr("width",  width)
    .attr("height", height);

  const plot = canvas.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // ── Color scale ────────────────────────────────────────────────────────────
  const allValues = [];
  years.forEach(y => {
    for (let m = 1; m <= 12; m++) {
      const v = (monthlyMap.get(y) || new Map()).get(m);
      if (v) allValues.push(v);
    }
  });

  const fullDomain = [0, d3.max(allValues)];

  const scaleColor = d3.scaleSequential()
    .domain(fullDomain)
    .interpolator(d3.interpolateBlues);

  // ── Month labels ───────────────────────────────────────────────────────────
  monthNames.forEach((m, i) => {
    plot.append("text")
      .attr("x", i * (cellW + gap) + cellW / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("class", "axisLabel")
      .text(m);
  });

  // ── Reset button — declared early so crisis bands can reference it ─────────
  // Must be declared before crisisPeriods.forEach so the click handlers can use it
  const resetBtn = d3.select("#heatmap-container")
    .append("div")
    .style("text-align", "center")
    .style("margin-top", "0.5rem")
    .style("display", "none");

  resetBtn.append("button")
    .attr("class", "era-btn active")
    .text("Reset zoom")
    .on("click", function() {
      scaleColor.domain(fullDomain);
      updateCellColors();
      resetBtn.style("display", "none");
    });

  // ── Crisis bands — drawn before cells so they sit underneath ──────────────
  crisisPeriods.forEach(crisis => {
    const crisisYearIndices = crisis.years
      .map(y => years.indexOf(y))
      .filter(i => i !== -1);
    if (!crisisYearIndices.length) return;

    const minYi = Math.min(...crisisYearIndices);
    const maxYi = Math.max(...crisisYearIndices);
    const bandY  = minYi * (cellH + gap) - gap / 2;
    const bandH  = (maxYi - minYi + 1) * (cellH + gap);

    // Click handler shared by band and label
    function zoomToCrisis() {
      const crisisValues = [];
      crisis.years.forEach(y => {
        for (let m = 1; m <= 12; m++) {
          const v = (monthlyMap.get(y) || new Map()).get(m);
          if (v) crisisValues.push(v);
        }
      });
      scaleColor.domain([0, d3.max(crisisValues)]);
      updateCellColors();
      resetBtn.style("display", "block");
    }

    // Shaded band
    const bandRect = plot.append("rect")
      .attr("class", "crisis-band")
      .attr("x", -4)
      .attr("y", bandY)
      .attr("width", plot_width + 8)
      .attr("height", bandH)
      .attr("rx", 3)
      .style("cursor", "pointer");

    // Use native addEventListener instead of D3 .on() for reliability
    bandRect.node().addEventListener("click", zoomToCrisis);

    // Crisis label
    const labelEl = plot.append("text")
      .attr("class", "crisis-label")
      .attr("x", plot_width + 10)
      .attr("y", bandY + bandH / 2 + 4)
      .style("font-size", "9px")
      .style("cursor", "pointer")
      .text(crisis.label);

    labelEl.node().addEventListener("click", zoomToCrisis);
  });

  // ── Cells + row labels ─────────────────────────────────────────────────────
  const rowGroups = [];

  years.forEach((year, yi) => {
    const rowY = yi * (cellH + gap);

    const yearLabel = plot.append("text")
      .attr("x", -8)
      .attr("y", rowY + cellH / 2 + 4)
      .attr("text-anchor", "end")
      .attr("class", "axisLabel")
      .style("cursor", "pointer")
      .text(year);

    const cells = [];

    for (let m = 1; m <= 12; m++) {
      const val = (monthlyMap.get(year) || new Map()).get(m) || 0;
      const x   = (m - 1) * (cellW + gap);

      const rect = plot.append("rect")
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
        .style("opacity", 0)           // start hidden for draw-in animation
        .style("cursor", "pointer");

      cells.push({ rect, val, m });
    }

    rowGroups.push({ year, yi, rowY, cells, yearLabel });
  });

  // ── Row highlight on hover ─────────────────────────────────────────────────
  // Invisible full-row hit targets
  years.forEach((year, yi) => {
    const rowY = yi * (cellH + gap);

    plot.append("rect")
      .attr("x", -margin.left)
      .attr("y", rowY - gap / 2)
      .attr("width", width)
      .attr("height", cellH + gap)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseover", function() {
        // Dim all other rows
        plot.selectAll(".heatmap-tile")
          .transition().duration(150)
          .style("opacity", 1)
          .filter(function() {
            return +this.getAttribute("data-year") !== year;
          })
          .style("opacity", 0.15);

        // Bold the year label
        plot.selectAll(".axisLabel")
          .filter(function() { return this.textContent == year; })
          .style("font-weight", "700")
          .style("fill", "#009ade");
      })
      .on("mouseout", function() {
        plot.selectAll(".heatmap-tile")
          .transition().duration(200)
          .style("opacity", 1);

        plot.selectAll(".axisLabel")
          .style("font-weight", null)
          .style("fill", null);
      });
  });

  // ── Update cell colors after zoom or reset ─────────────────────────────────
  function updateCellColors() {
    plot.selectAll(".heatmap-tile")
      .transition().duration(500)
      .style("fill", function() {
        const y = +this.getAttribute("data-year");
        const m = +this.getAttribute("data-month");
        const val = (monthlyMap.get(y) || new Map()).get(m) || 0;
        return val > 0 ? scaleColor(val) : "#eceae4";
      });
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────
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

  // ── Color legend ───────────────────────────────────────────────────────────
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
  const gradient = defs.append("linearGradient").attr("id", "heatmap-gradient");

  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", scaleColor(t * d3.max(allValues)));
  }

  legend.append("rect")
    .attr("width", legendWidth).attr("height", legendHeight)
    .attr("rx", 2).style("fill", "url(#heatmap-gradient)");

  legend.append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .attr("class", "axes")
    .call(d3.axisBottom(legendScale).ticks(4).tickFormat(d => (d / 1e6).toFixed(1) + "M"))
    .selectAll("text")
    .style("fill", "#c1eafb");

  legend.append("text")
    .attr("x", legendWidth / 2).attr("y", legendHeight + 30)
    .attr("text-anchor", "middle").attr("class", "axisLabel")
    .text("Passengers per month");

  // ── Scroll-triggered draw-in animation ────────────────────────────────────
  // Re-animates every time the section scrolls into view
  const container = document.querySelector("#heatmap-container");
  let hasAnimated = false;

  const drawObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Reset all cells to invisible before re-animating
        plot.selectAll(".heatmap-tile").style("opacity", 0);

        // Animate cells in column by column (month by month)
        for (let m = 1; m <= 12; m++) {
          setTimeout(() => {
            plot.selectAll(".heatmap-tile")
              .filter(function() { return +this.getAttribute("data-month") === m; })
              .transition().duration(400)
              .style("opacity", 1);
          }, (m - 1) * 80);   // 80ms stagger per month column
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
    console.log("data loading error");
    console.log(err);
  });
}

loadAndDrawHeatmap();