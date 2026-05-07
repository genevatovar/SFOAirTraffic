// piecharts.js - SFO Scrollytelling Project
// Small Multiples Pie Charts — replaces previous radial spoke/chord diagram
// Dataset: sfo_enplaned_clean.csv (loaded directly)
// Variable: passengers — total enplaned per GEO region, grouped by era
// Eras: pre-recession (1999–2007), recession (2008–2010),
//       post-recession (2011–2019), covid (2020–2021), recovery (2022–2026)
// Layout: 5 donut charts displayed side by side, one per era
// No toggle buttons — all eras shown simultaneously with era labels
// Interactions: hover slice or legend to expand slice and highlight region
//               across all pie charts simultaneously

function drawPieCharts() {
  d3.csv("sfo_enplaned_clean.csv", d => ({
    year:            +d.year,
    geo_region:      d.geo_region,
    geo_summary:     d.geo_summary,
    passenger_count: +d.passenger_count
  }))
  .then(function(data) {
    const intl = data.filter(d =>
      d.geo_summary === "International" &&
      d.geo_region &&
      d.year &&
      !isNaN(d.passenger_count)
    );

    // Change the eras filter ranges
    const eras = {
      pre_911:        { label: "Pre-9/11\n2000–2001",       filter: d => d.year >= 2000 && d.year <= 2001 },
      post_911:       { label: "Post-9/11\n2002–2007",       filter: d => d.year >= 2002 && d.year <= 2007 },
      recession:      { label: "Recession\n2008–2010",       filter: d => d.year >= 2008 && d.year <= 2010 },
      post_recession: { label: "Pre-COVID Peak\n2011–2019",  filter: d => d.year >= 2011 && d.year <= 2019 },
      covid:          { label: "COVID Crisis\n2020–2021",    filter: d => d.year >= 2020 && d.year <= 2021 },
      recovery:       { label: "Recovery\n2022–2025",        filter: d => d.year >= 2022 && d.year <= 2025 }
    };

    const eraData = {};
    Object.entries(eras).forEach(([eraKey, { filter }]) => {
      const filtered = intl.filter(filter);
      const regionMap = d3.rollup(
        filtered,
        v => d3.sum(v, d => d.passenger_count),
        d => d.geo_region
      );
      eraData[eraKey] = Array.from(regionMap, ([region, passengers]) => ({
        region, passengers
      })).sort((a, b) => b.passengers - a.passengers);
    });

    drawSmallMultiplesPie(eraData, eras);
  })
  .catch(err => console.log("data loading error", err));
}

function drawSmallMultiplesPie(eraData, eras) {
  // One color per destination region
  const REGION_COLORS = {
    "Asia":                "#185FA5",
    "Europe":              "#1D9E75",
    "Canada":              "#BA7517",
    "Mexico":              "#D85A30",
    "Central America":     "#7F77DD",
    "South America":       "#c0392b",
    "Middle East":         "#888780",
    "Australia / Oceania": "#5DCAA5",
  };

  const eraKeys = Object.keys(eras);

  // Layout — responsive: 2 columns on mobile, 3 on desktop; legend below on mobile
  const containerEl = document.getElementById("pie-container");
  const containerW  = containerEl.clientWidth || 900;
  const isMobile    = containerW < 560;

  const cols      = isMobile ? 2 : 3;
  const rows      = Math.ceil(eraKeys.length / cols);
  const pieR      = isMobile ? Math.floor((containerW / cols) * 0.38) : 100;
  const labelH    = isMobile ? 36  : 50;
  const padX      = isMobile ? 8   : 50;
  const padY      = isMobile ? 32  : 80;
  const legendW   = isMobile ? 0   : 180;  // legend moves below on mobile
  const chartAreaW = cols * (pieR * 2 + padX) + padX;
  const svgW      = Math.min(containerW, chartAreaW + legendW);
  const svgH      = rows * (pieR * 2 + labelH) + padY + (isMobile ? 200 : 60);

  // TOOLTIP
  let tooltip = d3.select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }

  const canvas = d3.select("#pie-container")
    .append("svg")
    .attr("width",  svgW)
    .attr("height", svgH);

  // TITLE
  canvas.append("text")
    .attr("x", isMobile ? svgW / 2 : chartAreaW / 2)
    .attr("y", isMobile ? 18 : 24)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "12px" : "15px")
    .style("font-weight", "bold")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-75-white)")
    .text("SFO International Passengers by Destination Region");

  canvas.append("text")
    .attr("x", isMobile ? svgW / 2 : chartAreaW / 2)
    .attr("y", isMobile ? 34 : 42)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "10px" : "11px")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-50-white)")
    .text(isMobile
      ? "Tap a slice to highlight region"
      : "Hover a slice or legend item to see how that region shifted across eras");

  // PIE GENERATOR
  const pieGen = d3.pie()
    .value(d => d.passengers)
    .sort(null);

  const arcGen = d3.arc()
    .innerRadius(pieR * 0.35)
    .outerRadius(pieR);

  const arcHover = d3.arc()
    .innerRadius(pieR * 0.35)
    .outerRadius(pieR + (isMobile ? 7 : 12));

  // Highlight all slices of a region across all pies
  function highlightRegion(region) {
    canvas.selectAll(".pie-slice")
      .transition().duration(150)
      .style("fill-opacity", function() {
        return this.getAttribute("data-region") === region ? 1 : 0.2;
      })
      .attr("d", function() {
        if (this.getAttribute("data-region") === region) {
          const eraKey = this.getAttribute("data-era");
          const rows   = eraData[eraKey];
          const arcs   = pieGen(rows);
          const match  = arcs.find(a => a.data.region === region);
          return match ? arcHover(match) : null;
        }
        return null;
      });
  }

  function restoreAll() {
    canvas.selectAll(".pie-slice")
      .transition().duration(150)
      .style("fill-opacity", 0.85)
      .attr("d", function() {
        const eraKey = this.getAttribute("data-era");
        const rows   = eraData[eraKey];
        const arcs   = pieGen(rows);
        const region = this.getAttribute("data-region");
        const match  = arcs.find(a => a.data.region === region);
        return match ? arcGen(match) : null;
      });
  }

  // DRAW ONE PIE PER ERA
  const titleOffsetY = isMobile ? 44 : 60;

  eraKeys.forEach((eraKey, i) => {
    const rowIdx = Math.floor(i / cols);
    const colIdx = i % cols;

    // Center any partial last row
    const itemsInThisRow = Math.min(cols, eraKeys.length - rowIdx * cols);
    const rowTotalW = itemsInThisRow * (pieR * 2 + padX) - padX;
    const rowStartX = (chartAreaW - rowTotalW) / 2;

    const cx = rowStartX + colIdx * (pieR * 2 + padX) + pieR;
    const cy = titleOffsetY + labelH + rowIdx * (pieR * 2 + labelH + padY) + pieR;

    const rowData  = eraData[eraKey];
    const arcs     = pieGen(rowData);
    const total    = d3.sum(rowData, d => d.passengers);

    const g = canvas.append("g")
      .attr("class", "pie-group")
      .attr("transform", `translate(${cx}, ${cy})`);

    // Era label two lines above each pie
    const labelLines = eras[eraKey].label.split("\n");

    g.append("text")
      .attr("y", -pieR - (isMobile ? 18 : 26))
      .attr("text-anchor", "middle")
      .style("font-size", isMobile ? "11px" : "13px")
      .style("font-weight", "700")
      .style("font-family", "Montserrat, sans-serif")
      .style("fill", "var(--sfo-75-white)")
      .text(labelLines[0]);

    g.append("text")
      .attr("y", -pieR - (isMobile ? 6 : 12))
      .attr("text-anchor", "middle")
      .style("font-size", isMobile ? "9px" : "11px")
      .style("font-family", "Montserrat, sans-serif")
      .style("fill", "var(--sfo-50-white)")
      .text(labelLines[1]);

    // Draw slices
    arcs.forEach((arc, idx) => {
      const color = REGION_COLORS[arc.data.region] || "#888";
      const pct   = ((arc.data.passengers / total) * 100).toFixed(1);

      const slice = g.append("path")
        .attr("class", "pie-slice")
        .attr("data-region", arc.data.region)
        .attr("data-era", eraKey)
        .attr("d", arcGen(arc))
        .style("fill", color)
        .style("fill-opacity", 0)
        .style("stroke", "white")
        .style("stroke-width", isMobile ? 0.5 : 0.8)
        .style("cursor", "pointer");

      // Staggered fade-in on load
      slice.transition()
        .delay(i * 100 + idx * 40)
        .duration(400)
        .style("fill-opacity", 0.85);

      // Hover highlights this region across ALL pies
      const showTooltip = (e) => {
        highlightRegion(arc.data.region);
        const px = e.touches ? e.touches[0].pageX : e.pageX;
        const py = e.touches ? e.touches[0].pageY : e.pageY;
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(`
            <strong>${arc.data.region}</strong><br/>
            ${d3.format(",.0f")(arc.data.passengers)} passengers<br/>
            ${pct}% of era total<br/>
            <span style="opacity:0.7;font-size:11px">${eras[eraKey].label.replace("\n", " ")}</span>
          `)
          .style("left", (px + 12) + "px")
          .style("top",  (py - 28) + "px");
      };

      slice
        .on("mouseover touchstart", showTooltip)
        .on("mousemove", function(e) {
          tooltip
            .style("left", (e.pageX + 12) + "px")
            .style("top",  (e.pageY - 28) + "px");
        })
        .on("mouseout touchend", function() {
          restoreAll();
          tooltip.transition().duration(200).style("opacity", 0);
        });
    });
  });

  // LEGEND
  // Desktop: right column. Mobile: below pies.
  const pieSectionH = titleOffsetY + rows * (pieR * 2 + labelH + padY);

  if (isMobile) {
    // Expand SVG height to fit inline legend below pies
    const legendRows = Object.entries(REGION_COLORS);
    const legendH    = legendRows.length * 24 + 30;
    canvas.attr("height", pieSectionH + legendH);

    const legendG = canvas.append("g")
      .attr("transform", `translate(16, ${pieSectionH})`);

    legendG.append("text")
      .attr("x", 0).attr("y", 0)
      .style("font-size", "12px")
      .style("font-weight", "700")
      .style("font-family", "Montserrat, sans-serif")
      .style("fill", "var(--sfo-75-white)")
      .text("Region");

    legendRows.forEach(([region, color], i) => {
      const row = legendG.append("g")
        .attr("transform", `translate(0, ${18 + i * 24})`)
        .style("cursor", "pointer")
        .on("click touchstart", function(e) {
          highlightRegion(region);
          const px = e.pageX || (e.touches && e.touches[0].pageX);
          const py = e.pageY || (e.touches && e.touches[0].pageY);
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(`<strong>${region}</strong>`)
            .style("left", (px + 12) + "px")
            .style("top",  (py - 28) + "px");
        })
        .on("mouseout touchend", function() {
          restoreAll();
          tooltip.transition().duration(200).style("opacity", 0);
        });

      // Color swatch
      row.append("rect")
        .attr("width", 15).attr("height", 15)
        .attr("rx", 2)
        .style("fill", color)
        .style("fill-opacity", 0.85);

      // Region name
      row.append("text")
        .attr("x", 22).attr("y", 12)
        .style("font-size", "11px")
        .style("font-family", "Montserrat, sans-serif")
        .style("fill", "var(--sfo-75-white)")
        .text(region);
    });

  } else {
    const legendX = chartAreaW + 20;
    const legendY = 50;

    const legendG = canvas.append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    legendG.append("text")
      .attr("x", 0).attr("y", 0)
      .style("font-size", "13px")
      .style("font-weight", "700")
      .style("font-family", "Montserrat, sans-serif")
      .style("fill", "var(--sfo-75-white)")
      .text("Region");

    Object.entries(REGION_COLORS).forEach(([region, color], i) => {
      const row = legendG.append("g")
        .attr("transform", `translate(0, ${20 + i * 28})`)
        .style("cursor", "pointer")
        .on("mouseover", function(e) {
          highlightRegion(region);
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(`<strong>${region}</strong><br/>Hover a slice for era details`)
            .style("left", (e.pageX + 12) + "px")
            .style("top",  (e.pageY - 28) + "px");
        })
        .on("mousemove", function(e) {
          tooltip
            .style("left", (e.pageX + 12) + "px")
            .style("top",  (e.pageY - 28) + "px");
        })
        .on("mouseout", function() {
          restoreAll();
          tooltip.transition().duration(200).style("opacity", 0);
        });

      // Color swatch
      row.append("rect")
        .attr("width", 18).attr("height", 18)
        .attr("rx", 3)
        .style("fill", color)
        .style("fill-opacity", 0.85);

      // Region name
      row.append("text")
        .attr("x", 26).attr("y", 13)
        .style("font-size", "12px")
        .style("font-family", "Montserrat, sans-serif")
        .style("fill", "var(--sfo-75-white)")
        .text(region);
    });
  }
}

drawPieCharts();

// Redraw on resize
let pieResizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(pieResizeTimer);
  pieResizeTimer = setTimeout(() => {
    d3.select("#pie-container svg").remove();
    drawPieCharts();
  }, 250);
});