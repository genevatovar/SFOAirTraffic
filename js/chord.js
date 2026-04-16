// Chord Diagram - SFO Scrollytelling Project
// Dataset: chord_by_era.json (built from sfo_enplaned_clean.csv)
// Variable: passengers — total enplaned per GEO region, grouped by era
// Eras: pre-COVID (1999–2019), crisis (2020–2021), recovery (2022–2026)
// SFO is the fixed hub center; arc thickness = passenger volume
// Era toggle buttons allow switching between the three periods

let chordDataGlobal = null;

function drawGraph(chordEra) {
  chordDataGlobal = chordEra;
  renderChord("pre");
}

function renderChord(eraKey) {
  // Clear previous render before redrawing
  d3.select("#chord-container").selectAll("*").remove();

  const rows = chordDataGlobal[eraKey];

  const width  = 700, height = 560;
  const margin = { top: 70, right: 30, bottom: 30, left: 30 };
  const plot_width  = width  - margin.left - margin.right;
  const plot_height = height - margin.top  - margin.bottom;

  const cx = margin.left + plot_width  / 2;
  const cy = margin.top  + plot_height / 2;

  const outerR = Math.min(plot_width, plot_height) * 0.42;
  const innerR = outerR * 0.72;

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

  // CANVAS
  const canvas = d3.select("#chord-container")
    .append("svg")
    .attr("width",  width)
    .attr("height", height);

  // TITLE
  const eraLabels = {
    pre:      "Pre-COVID (1999–2019)",
    crisis:   "Crisis (2020–2021)",
    recovery: "Recovery (2022–2026)"
  };

  canvas.append("text")
    .attr("x", width / 2)
    .attr("y", 32)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("font-family", "Raleway, sans-serif")
    .text("SFO International Passengers by Destination Region");

  canvas.append("text")
    .attr("x", width / 2)
    .attr("y", 52)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("fill", "#666")
    .style("font-family", "Nunito, sans-serif")
    .text(`Arc thickness = passenger volume  ·  ${eraLabels[eraKey]}`);

  // CHORD MATH
  const total   = d3.sum(rows, d => d.passengers);
  const gap     = 0.04;
  const arcSpan = (Math.PI * 2 - gap * rows.length) / total;

  // TOOLTIP
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // SFO center node
  canvas.append("circle")
    .attr("cx", cx).attr("cy", cy).attr("r", 30)
    .style("fill", "#1a1a1a");

  canvas.append("text")
    .attr("x", cx).attr("y", cy + 4)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .style("font-family", "Raleway, sans-serif")
    .style("fill", "#fff")
    .text("SFO");

  let angle = -Math.PI / 2;

  rows.forEach(({ region, passengers }) => {
    const span  = passengers * arcSpan;
    const midA  = angle + span / 2;
    const color = REGION_COLORS[region] || "#888";

    // Bezier ribbon from SFO center to region arc midpoint
    const arcMidX = cx + innerR * Math.cos(midA);
    const arcMidY = cy + innerR * Math.sin(midA);
    const sfoX    = cx + 30 * Math.cos(midA);
    const sfoY    = cy + 30 * Math.sin(midA);
    const cpX     = cx + (innerR * 0.45) * Math.cos(midA);
    const cpY     = cy + (innerR * 0.45) * Math.sin(midA);
    const w       = 2 + (passengers / total) * 22;

    // Ribbon
    canvas.append("path")
      .attr("d", `M ${sfoX} ${sfoY} Q ${cpX} ${cpY} ${arcMidX} ${arcMidY}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", w)
      .attr("stroke-opacity", 0.55)
      .style("cursor", "pointer")
      .on("mouseover", function(e) {
        d3.select(this).attr("stroke-opacity", 0.9);
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(`<strong>${region}</strong><br/>${d3.format(",.0f")(passengers)} passengers`)
          .style("left", (e.pageX + 12) + "px")
          .style("top",  (e.pageY - 28) + "px");
      })
      .on("mousemove", function(e) {
        tooltip
          .style("left", (e.pageX + 12) + "px")
          .style("top",  (e.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke-opacity", 0.55);
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Outer arc segment
    const arcGen = d3.arc()
      .innerRadius(outerR - 12)
      .outerRadius(outerR)
      .startAngle(angle)
      .endAngle(angle + span);

    canvas.append("path")
      .attr("transform", `translate(${cx},${cy})`)
      .attr("d", arcGen())
      .attr("fill", color);

    // Region label outside the arc
    const labelR = outerR + 18;
    const lx     = cx + labelR * Math.cos(midA);
    const ly     = cy + labelR * Math.sin(midA);
    const anchor = Math.cos(midA) > 0.1 ? "start" : Math.cos(midA) < -0.1 ? "end" : "middle";

    canvas.append("text")
      .attr("x", lx).attr("y", ly + 4)
      .attr("text-anchor", anchor)
      .style("font-size", "11px")
      .style("font-family", "Nunito, sans-serif")
      .style("fill", "#444")
      .text(region);

    angle += span + gap;
  });

  // LEGEND
  const legendG = canvas.append("g")
    .attr("transform", `translate(${width - 155}, ${margin.top + 10})`);

  legendG.append("text")
    .attr("x", 0).attr("y", 0)
    .style("font-size", "13px")
    .style("font-weight", "bold")
    .style("font-family", "Raleway, sans-serif")
    .text("Region");

  Object.entries(REGION_COLORS).forEach(([region, color], i) => {
    const row = legendG.append("g")
      .attr("transform", `translate(0, ${20 + i * 24})`);

    row.append("rect")
      .attr("width", 14).attr("height", 14)
      .attr("rx", 2)
      .style("fill", color)
      .style("fill-opacity", 0.85);

    row.append("text")
      .attr("x", 20).attr("y", 11)
      .style("font-size", "11px")
      .style("font-family", "Nunito, sans-serif")
      .style("fill", "#333")
      .text(region);
  });
}

// Era toggle — called from onclick buttons in HTML
function setEra(eraKey, btn) {
  document.querySelectorAll(".era-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  // Remove old tooltip before redraw
  d3.selectAll(".tooltip").remove();

  renderChord(eraKey);
}

function draw() {
  d3.json("chord_by_era.json")
    .then(function(chordEra) {
      drawGraph(chordEra);
    })
    .catch(err => {
      console.log("data loading error");
      console.log(err);
    });
}

draw();