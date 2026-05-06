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

  // Layout — 3 top row, 2 bottom row, legend on the right
  const pieR      = 100;         // radius of each pie
  const labelH    = 50;          // space above each pie for era label
  const padX      = 50;          // horizontal padding between pies
  const padY      = 80;          // vertical padding between rows
  const legendW   = 180;         // legend column on the right
  const cols      = 3;           // pies per row
  const rows      = 2;           // number of rows
  const chartAreaW = cols * (pieR * 2 + padX) + padX;
  const svgW      = chartAreaW + legendW;
  const svgH      = rows * (pieR * 2 + labelH) + padY + 60;

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
    .attr("x", chartAreaW / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .style("font-weight", "bold")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-75-white)")
    .text("SFO International Passengers by Destination Region");

  canvas.append("text")
    .attr("x", chartAreaW / 2)
    .attr("y", 42)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-50-white)")
    .text("Hover a slice or legend item to see how that region shifted across eras");

  // PIE GENERATOR
  const pieGen = d3.pie()
    .value(d => d.passengers)
    .sort(null);

  const arcGen = d3.arc()
    .innerRadius(pieR * 0.35)
    .outerRadius(pieR);

  const arcHover = d3.arc()
    .innerRadius(pieR * 0.35)
    .outerRadius(pieR + 12);

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

  // DRAW ONE PIE PER ERA — 3 top, 2 bottom, centered
  eraKeys.forEach((eraKey, i) => {
    const rowIdx = Math.floor(i / cols);
    const colIdx = i % cols;

    // Center the bottom row (2 pies) by offsetting it
    const itemsInThisRow = 3;
    const rowTotalW = itemsInThisRow * (pieR * 2 + padX) - padX;
    const rowStartX = (chartAreaW - rowTotalW) / 2;

    const cx = rowStartX + colIdx * (pieR * 2 + padX) + pieR;
    const cy = 60 + labelH + rowIdx * (pieR * 2 + labelH + padY) + pieR;

    const rowData  = eraData[eraKey];
    const arcs     = pieGen(rowData);
    const total    = d3.sum(rowData, d => d.passengers);

    const g = canvas.append("g")
      .attr("class", "pie-group")
      .attr("transform", `translate(${cx}, ${cy})`);

    // Era label two lines above each pie
    const labelLines = eras[eraKey].label.split("\n");

    g.append("text")
      .attr("y", -pieR - 26)
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "700")
      .style("font-family", "Montserrat, sans-serif")
      .style("fill", "var(--sfo-75-white)")
      .text(labelLines[0]);

    g.append("text")
      .attr("y", -pieR - 12)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
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
        .style("stroke-width", 0.8)
        .style("cursor", "pointer");

      // Staggered fade-in on load
      slice.transition()
        .delay(i * 100 + idx * 40)
        .duration(400)
        .style("fill-opacity", 0.85);

      // Hover highlights this region across ALL pies
      slice
        .on("mouseover", function(e) {
          highlightRegion(arc.data.region);
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(`
              <strong>${arc.data.region}</strong><br/>
              ${d3.format(",.0f")(arc.data.passengers)} passengers<br/>
              ${pct}% of era total<br/>
              <span style="opacity:0.7;font-size:11px">${eras[eraKey].label.replace("\n", " ")}</span>
            `)
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
    });
  });

  // LEGEND 
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

drawPieCharts();