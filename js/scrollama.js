// SCROLLAMA
// Controls which viz panel is visible based on scroll position

const panels = [
  "heatmap-container",
  "smallmultiples-container",
  "streamgraph-container",
  "chord-container"
];

// Show only the panel matching the current step
function showPanel(index) {
  panels.forEach((id, i) => {
    document.getElementById(id).classList.toggle("is-active", i === index);
  });
}

// Initialize — show first panel on load
showPanel(0);

// Set up Scrollama
const scroller = scrollama();

scroller
  .setup({
    step: ".step",
    offset: 0.5,   // fires when step crosses the middle of the viewport
    debug: false
  })
  .onStepEnter(response => {
    // Update active step card
    d3.selectAll(".step").classed("is-active", false);
    d3.select(response.element).classed("is-active", true);

    // Swap visible chart
    showPanel(response.index);
  });

// Handle window resize
window.addEventListener("resize", scroller.resize);