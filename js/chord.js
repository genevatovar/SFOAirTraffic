// Chord Diagram - SFO Scrollytelling Project
// Dataset: sfo_enplaned_clean.csv (loaded directly, no longer needs chord_by_era.json)
// Variable: passengers — total enplaned per GEO region, grouped by era
// Eras: pre-recession (1999–2007), recession (2008–2010),
//       post-recession (2011–2019), covid (2020–2021), recovery (2022–2026)
// SFO is the fixed hub center; arc thickness = passenger volume
// Era toggle buttons allow switching between the five periods
// Interactions: animated era transitions, arc hover highlight, tooltip

let chordDataGlobal = null;
let currentEraKey   = "pre_recession";

function drawGraph(chordEra) {
  chordDataGlobal = chordEra;
  renderChord("pre_recession");
}

function renderChord(eraKey) {
  currentEraKey = eraKey;

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

  // Era labels for subtitle and tooltip
  const eraLabels = {
    pre_recession:  "Pre-Recession (1999–2007)",
    recession:      "Recession (2008–2010)",
    post_recession: "Pre-COVID Peak (2011–2019)",
    covid:          "COVID Crisis (2020–2021)",
    recovery:       "Recovery (2022–2026)"
  };

  // ── Reuse or create SVG — avoids full DOM wipe for smoother transitions ───
  let canvas = d3.select("#chord-container svg");
  if (canvas.empty()) {
    canvas = d3.select("#chord-container")
      .append("svg")
      .attr("width",  width)
      .attr("height", height);
  }

  // TITLE — update in place so it doesn't flash
  canvas.selectAll(".chord-title").remove();

  canvas.append("text")
    .attr("class", "chord-title")
    .attr("x", width / 2)
    .attr("y", 32)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-75-white)")
    .text("SFO International Passengers by Destination Region");

  // SUBTITLE — updates with current era label on each toggle
  canvas.selectAll(".chord-subtitle").remove();

  canvas.append("text")
    .attr("class", "chord-subtitle")
    .attr("x", width / 2)
    .attr("y", 52)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("fill", "var(--sfo-50-white)")
    .style("font-family", "Montserrat, sans-serif")
    .text(`Arc thickness = passenger volume  ·  ${eraLabels[eraKey]}`);

  // CHORD MATH
  const total   = d3.sum(rows, d => d.passengers);
  const gap     = 0.04;
  const arcSpan = (Math.PI * 2 - gap * rows.length) / total;

  // TOOLTIP — reuse existing or create to avoid duplicates
  let tooltip = d3.select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }

  // ── SFO center node — keep across transitions ──────────────────────────────
  canvas.selectAll(".sfo-node").remove();
  canvas.append("circle")
    .attr("class", "sfo-node")
    .attr("cx", cx).attr("cy", cy).attr("r", 30)
    .style("fill", "var(--sfo-20-black)");

  canvas.selectAll(".sfo-label").remove();
  canvas.append("text")
    .attr("class", "sfo-label")
    .attr("x", cx).attr("y", cy + 4)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-75-white)")
    .text("SFO");

  // ── Build geometry for all regions first so hover can reference all ribbons
  const regionData = [];
  let angle = -Math.PI / 2;

  rows.forEach(({ region, passengers }) => {
    const span  = passengers * arcSpan;
    const midA  = angle + span / 2;
    const color = REGION_COLORS[region] || "#888";

    const arcMidX = cx + innerR * Math.cos(midA);
    const arcMidY = cy + innerR * Math.sin(midA);
    const sfoX    = cx + 30 * Math.cos(midA);
    const sfoY    = cy + 30 * Math.sin(midA);
    const cpX     = cx + (innerR * 0.45) * Math.cos(midA);
    const cpY     = cy + (innerR * 0.45) * Math.sin(midA);
    const w       = 2 + (passengers / total) * 22;

    const arcGen = d3.arc()
      .innerRadius(outerR - 12)
      .outerRadius(outerR)
      .startAngle(angle)
      .endAngle(angle + span);

    regionData.push({
      region, passengers, color, span, midA,
      arcMidX, arcMidY, sfoX, sfoY, cpX, cpY, w,
      arcPath: arcGen()
    });

    angle += span + gap;
  });

  // ── Remove old ribbons and arcs before redrawing ───────────────────────────
  canvas.selectAll(".chord-ribbon, .chord-arc").remove();

  // ── Draw ribbons with animated transition from opacity 0 ──────────────────
  regionData.forEach((d, idx) => {

    // Ribbon connecting SFO center to region arc midpoint
    const ribbon = canvas.append("path")
      .attr("class", "chord-ribbon")
      .attr("data-region", d.region)
      .attr("d", `M ${d.sfoX} ${d.sfoY} Q ${d.cpX} ${d.cpY} ${d.arcMidX} ${d.arcMidY}`)
      .attr("fill", "none")
      .attr("stroke", d.color)
      .attr("stroke-width", d.w)
      .attr("stroke-opacity", 0)       // start invisible for transition
      .style("cursor", "pointer");

    // Animate ribbon in with a stagger per region
    ribbon.transition()
      .delay(idx * 60)
      .duration(500)
      .attr("stroke-opacity", 0.55);

    // ── Hover: highlight this ribbon, fade all others ──────────────────────
    ribbon
      .on("mouseover", function(e) {
        // Fade all ribbons down
        canvas.selectAll(".chord-ribbon")
          .transition().duration(150)
          .attr("stroke-opacity", 0.1);

        // Highlight hovered ribbon
        d3.select(this)
          .transition().duration(150)
          .attr("stroke-opacity", 1)
          .attr("stroke-width", d.w + 3);

        // Highlight matching outer arc
        canvas.selectAll(".chord-arc")
          .filter(function() { return this.getAttribute("data-region") === d.region; })
          .transition().duration(150)
          .style("fill-opacity", 1);

        // Tooltip shows region name, passenger volume, and current era
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(`
            <strong>${d.region}</strong><br/>
            ${d3.format(",.0f")(d.passengers)} passengers<br/>
            <span style="opacity:0.7;font-size:11px">${eraLabels[eraKey]}</span>
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
        // Restore all ribbons to default opacity and width
        canvas.selectAll(".chord-ribbon")
          .transition().duration(200)
          .attr("stroke-opacity", 0.55)
          .attr("stroke-width", function() {
            const r = this.getAttribute("data-region");
            const found = regionData.find(x => x.region === r);
            return found ? found.w : 2;
          });

        // Restore all arcs to default opacity
        canvas.selectAll(".chord-arc")
          .transition().duration(200)
          .style("fill-opacity", 0.85);

        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Outer arc segment — sized proportionally to passenger volume
    canvas.append("path")
      .attr("class", "chord-arc")
      .attr("data-region", d.region)
      .attr("transform", `translate(${cx},${cy})`)
      .attr("d", d.arcPath)
      .style("fill", d.color)
      .style("fill-opacity", 0)        // start invisible for transition
      .style("cursor", "pointer")
      .transition()
      .delay(idx * 60)
      .duration(500)
      .style("fill-opacity", 0.85);
  });

  // LEGEND
  canvas.selectAll(".chord-legend").remove();

  const legendG = canvas.append("g")
    .attr("class", "chord-legend")
    .attr("transform", `translate(${width - 155}, ${margin.top + 10})`);

  legendG.append("text")
    .attr("x", 0).attr("y", 0)
    .style("font-size", "13px")
    .style("font-weight", "bold")
    .style("font-family", "Montserrat, sans-serif")
    .style("fill", "var(--sfo-75-white)")
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
      .style("font-family", "Montserrat, sans-serif")
      .style("fill", "var(--sfo-75-white)")
      .text(region);
  });
}

// Era toggle — called from onclick buttons in HTML
// Triggers re-render with animated transition instead of full DOM wipe
function setEra(eraKey, btn) {
  document.querySelectorAll(".era-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderChord(eraKey);
}

function draw() {
  // Build chord data directly from CSV instead of chord_by_era.json
  // This ensures era groupings stay in sync with the main dataset
  d3.csv("sfo_enplaned_clean.csv", d => ({
    year:            +d.year,
    month:           +d.month,
    geo_region:      d.geo_region,
    geo_summary:     d.geo_summary,
    passenger_count: +d.passenger_count
  }))
  .then(function(data) {
    // Filter to international enplaned rows only
    const intl = data.filter(d =>
      d.geo_summary === "International" &&
      d.geo_region &&
      d.year &&
      !isNaN(d.passenger_count)
    );

    // Era date ranges — covers all three major disruptions
    const eras = {
      pre_recession:  d => d.year >= 1999 && d.year <= 2007,
      recession:      d => d.year >= 2008 && d.year <= 2010,
      post_recession: d => d.year >= 2011 && d.year <= 2019,
      covid:          d => d.year >= 2020 && d.year <= 2021,
      recovery:       d => d.year >= 2022
    };

    // Build the chord data structure for each era
    // Each era becomes an array of { region, passengers } sorted by volume
    const chordEra = {};

    Object.entries(eras).forEach(([eraKey, filterFn]) => {
      const eraData = intl.filter(filterFn);

      // Roll up to total passengers per region for this era
      const regionMap = d3.rollup(
        eraData,
        v => d3.sum(v, d => d.passenger_count),
        d => d.geo_region
      );

      // Convert map to array, sort descending by passenger volume
      chordEra[eraKey] = Array.from(regionMap, ([region, passengers]) => ({
        region,
        passengers
      })).sort((a, b) => b.passengers - a.passengers);
    });

    drawGraph(chordEra);
  })
  .catch(err => {
    console.log("data loading error", err);
  });
}

draw();