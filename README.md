# SFO Air Traffic Passenger Trends

> CS 360 Final Project

> A data visualization project exploring how major disruptions shaped passenger traffic at San Francisco International Airport from 1999 to the present.

**Author:** Geneva Tovar
**Course:** CS 360 Spring 2026 | Professor Joshi

---

## Background & Motivation

As a frequent SFO flyer, I have a personal connection to this airport and an interest in understanding how it has performed over time. SFO is consistently ranked among the best airports in the United States, known for unique amenities like museum exhibits, sensory rooms, and high-quality dining. However, behind that reputation is a passenger traffic story shaped by forces completely outside the airport's control. I wanted to explore how a major airport like SFO holds up during large-scale disruptions, and what recovery actually looks like in the data. This project lets me combine that personal interest with data visualization to uncover patterns that are hard to see in raw numbers.

---

## Project Objectives

This project visualizes monthly SFO passenger traffic data from 1999 to the present to answer these questions:

1. How do seasonal travel patterns at SFO vary across months and years, and how were those patterns disrupted during crises? A calendar heat map will let users spot recurring peaks, off-season dips, and outliers.
2. How did major historical crises, including the 2008 recession and the COVID-19 pandemic, disrupt passenger traffic/volume at SFO, and how long did each recovery take? A user will be able to see how passenger volume was distributed across international destination regions, and how that distribution shifted during and after each crisis.
3. Did domestic and international passenger traffic recover at different rates after each disruption? A user will be able to see whether SFO's international routes lagged behind domestic ones, and draw their own conclusions about which segment of air travel is more vulnerable during a crisis.
4. Which airlines shrank, exited, or grew their presence at SFO after each crisis? A user will be able to track how the airline landscape at SFO shifted over time, seeing which carriers came out ahead and which pulled back.

---

## Data

Air Traffic Passenger Statistics published by the SF Airport Commission through the DataSF open data portal. The dataset contains monthly traffic records at SFO beginning from July 1999 through the present day, being updated quarterly.

**Key columns used:**
- Activity_Period (year & month)
- Operating_Airline
- Published_Airline
- GEO_Summary (Domestic or International)
- GEO_Region (US, Asia, Europe, Canada, Mexico, etc.)
- Activity_Type_Code (Enplaned, Deplaned, or Thru/Transit)
- Terminal
- Passenger_Count

---

## Data Processing

The data is somewhat clean as it is updated quarterly and maintained by a city government agency, but some cleaning was necessary:

- Activity_Period stores dates as a six-digit integer (e.g., 202012 for December 2020) and needs to be parsed into a proper date format for time-series plotting.
- Rows are filtered to Activity_Type_Code = "Enplaned" before summing, since an airline can show up in multiple rows per month across different terminals and regions, which makes it easy to accidentally double-count.
- Some airline names are inconsistent across years due to rebranding or mergers and are standardized.
- Geo_Region labels are standardized and grouped into a consistent set of destination categories for the small multiples pie charts.

**Derived quantities:**
- Monthly total passenger counts aggregated across all airlines and terminals
- Monthly domestic vs. international passenger counts using GEO_Summary
- Per-airline monthly passenger counts to track individual carrier trends over time
- Year-over-year percentage change to measure recovery speed after each crisis
- Monthly outbound (Enplaned) passenger counts by destination region using Geo_Region to populate each pie chart's slices
- Crisis windows annotated: 2008 recession (approx. September 2008 – June 2009) and COVID-19 (March 2020 – present)

---

## Tools & Implementation

Data processing is implemented in JavaScript using D3.js:

- `d3.csv()` to load the raw CSV file
- Parsed and filtered in-browser
- `d3.rollup()` and `d3.group()` for aggregation
- D3's pie and arc generators for small multiples pie charts
- D3's stack and area generators for stream graph

---

## Visualization Design

### Approach
This project uses scrollytelling. The user scrolls through a guided story about SFO's passenger traffic history, with each step revealing a new visualization and a short caption. This format works well here because each crisis has a clear before, during, and after. Each of the four scroll steps maps to one of the four project objectives.

### Scroll Steps
1. **Calendar Heat Map** — An immediate seasonal and crisis overview of the full dataset
2. **Small Multiples Pie Charts** — How SFO's international passenger volume was distributed across destination regions, and how that composition changed during and after each crisis
3. **Small Multiples Line Chart** — Domestic vs. international recovery comparison
4. **Stream Graph** — How the airline market at SFO shifted over time

Color encodes category throughout (destination region, airline, or domestic vs. international). Annotations mark key dates like travel bans and recovery milestones. Hover tooltips allow users to inspect exact values.

### Prototype Designs

**Design 1 — Calendar Heat Map (Objective 1)**
A grid with months on the x-axis and years on the y-axis. Each cell is colored by total monthly passenger count using a sequential single-hue color scale. Peaks are immediately visible every year, the 2008 recession shows up as a subtler band of lighter cells, and COVID-19 appears as a washout across 2020. The tradeoff is that precise year-over-year comparison is harder here than in a line chart, which is why this view comes first as an overview.

**Design 2 — Small Multiples Pie Charts (Objective 2)**
A series of pie charts, each representing a distinct time period (pre-crisis, crisis, and recovery), showing the share of international enplaned passengers by destination region. Color distinguishes each region consistently across all charts. This makes it easy to see which regions shrank or grew in share during each disruption. The tradeoff is that pie charts make precise comparison between similarly-sized slices difficult, so tooltips display exact values and regions are ordered consistently across charts.

**Design 3 — Small Multiples Line Chart (Objective 3)**
Two side-by-side line charts sharing the same y-axis scale, one for domestic and one for international traffic, both with shaded crisis bands. This directly answers whether international routes lagged behind domestic ones during recovery. Position on a shared axis is used rather than color or area, which makes comparison straightforward. The tradeoff is that this view takes up more horizontal space and loses the unified total-traffic picture.

**Design 4 — Stream Graph (Objective 4)**
The top five to six airlines at SFO are shown as flowing bands over time, with each band's width proportional to that airline's share of monthly passenger volume. Stream graphs make it easy to see how the composition of the airline market shifted after each crisis. The tradeoff is that exact per-airline values are difficult to read without tooltips, and smaller carriers can be drowned out, so the view is filtered to the top airlines and paired with hover interactions.

### Visual Encoding Summary
- Calendar heat map: sequential color scale where intensity represents passenger count
- Small multiples pie charts: color to distinguish destination regions, arc angle to encode share of volume
- Small multiples line chart: position on a shared y-axis for accurate quantity comparison
- Stream graph: color to distinguish airlines, area width for volume
- Across all views: shaded crisis bands and event annotations mark the same key dates for cross-referencing

---

## Five Design Sheet Methodology

- Sheet 1: Initial ideas and filtering
- Sheets 2–5: Each develop one of the four prototype designs with layout, data, and interaction details
- Sheet 6: Final combined design

---

## Must-Have Features

- **Calendar Heat Map** of monthly SFO passenger volume from 1999 to present, using a sequential color scale with month on the x-axis and year on the y-axis. Meets Objective 1 by making seasonal patterns and the full scope of each crisis immediately visible.
- **Small Multiples Pie Charts** showing the distribution of SFO's international enplaned passengers by destination region across pre-crisis, crisis, and recovery periods. Meets Objective 2 by revealing how the composition of international travel shifted geographically during each disruption.
- **Small Multiples Line Chart** comparing domestic vs. international monthly traffic over the same period, with aligned crisis bands. Meets Objective 3 because the difference in recovery speed between segments is directly comparable across the two panels.
- **Stream Graph** of the top five to six airlines at SFO over time, with each band's width proportional to that airline's share of yearly passenger volume. Meets Objective 4 by showing which carriers grew, shrank, or exited SFO after each crisis.
- **Scrollytelling structure** with narrative captions at each of the four scroll steps. Ties all four objectives together and provides the historical context users need to understand what is being conveyed.

## Optional Features

- Hover tooltips with exact passenger count, month, airline, or destination region at any data point across all four views
- A brush or zoom interaction on small multiples to isolate a specific crisis window
- Dropdown to view one airline's full trend in isolation in the stream graph
- Year-over-year percentage change chart as a secondary panel along small multiples
- Smooth animated transitions between scroll steps
- Mobile-responsive layout

---

## Project Schedule

| Week | Dates | Tasks | Deliverable |
|------|-------|-------|-------------|
| 1 | Apr 7–13 | Download dataset, parse Activity_Period, filter to Enplaned rows, clean airline names, prepare destination region data for pie charts | Clean CSV and data ready for visualization |
| 2 | Apr 14–20 | Finish proposal, complete FDS sketches for all four prototypes plus final | Submitted proposal with all sections and sketches |
| 3 | Apr 21–27 | Set up scrollytelling HTML/JS structure, build scroll step 1 (calendar heat map) | First scroll step working in browser |
| 4 | Apr 28–May 4 | Build scroll step 2 (small multiples pie charts) and wire into scroll flow | Second scroll step working |
| 5 | May 5–11 | Build scroll steps 3 and 4 (small multiples line chart and stream graph), write all four narrative captions | All four visualizations complete, full scroll flow working end to end |
| 6 | May 12–17 | Polish layout, colors, typography, add tooltips and hover interactions, start project report | Polished draft and report outline |
| 7 | May 18–20 | Final testing, proofread captions, finish and submit report | Final project submitted |

---

## Works Cited

Mumbower, Stacey. "Airline Market Exit after a Shock Event: Insights from the COVID-19 Pandemic." *Transportation Research Interdisciplinary Perspectives*, vol. 14, June 2022, p. 100621, https://doi.org/10.1016/j.trip.2022.100621.

Abbamonte, Kiera. "15 Engaging Scrollytelling Examples to Inspire Your Content." Shorthand.com, shorthand.com/the-craft/scrollytelling-examples/index.html.

Segel, Edward, and Jeffrey Heer. "Narrative Visualization: Telling Stories with Data." *IEEE Transactions on Visualization and Computer Graphics*, vol. 16, no. 6, Nov. 2010, pp. 1139–1148, https://doi.org/10.1109/tvcg.2010.179.

Sun, Xiaoqian, et al. "A Data-Driven Analysis of the Aviation Recovery from the COVID-19 Pandemic." *Journal of Air Transport Management*, vol. 109, June 2023, p. 102401, https://doi.org/10.1016/j.jairtraman.2023.102401.

Van Wijk, Jarke, and Edward Van Selow. *Cluster and Calendar Based Visualization of Time Series Data*. 1999.

"The Impact of COVID-19 on Airports—and the Path to Recovery." Airports Council International, 22 Feb. 2023, aci.aero/2023/02/22/the-impact-of-covid-19-on-airportsand-the-path-to-recovery-industry-outlook-for-2023/.

"How to Implement Scrollytelling with Six Different Libraries." The Pudding, 2017, pudding.cool/process/how-to-implement-scrollytelling/.

## SOURCES:

- D3.js: https://d3js.org/

- d3-scale: https://d3js.org/d3-scale

- d3-scale-chromatic: https://d3js.org/d3-scale-chromatic

- d3-axis: https://d3js.org/d3-axis

- d3-shape: https://d3js.org/d3-shape

- d3-selection: https://d3js.org/d3-selection

- d3-chord: https://d3js.org/d3-chord

- d3-hierarchy: https://d3js.org/d3-hierarchy

- d3-time-format: https://d3js.org/d3-time-format

- d3-array: https://d3js.org/d3-array

- d3-transition: https://d3js.org/d3-transition

- D3 Graph Gallery - Heatmap: https://d3-graph-gallery.com/heatmap.html

- D3 Graph Gallery - Stream graph: https://d3-graph-gallery.com/streamgraph.html

- D3 Graph Gallery - Area chart: https://d3-graph-gallery.com/area.html

- D3 Graph Gallery - Chord diagram: https://d3-graph-gallery.com/chord.html

- D3 Graph Gallery - Line chart: https://d3-graph-gallery.com/line.html

- D3 Stream graph example: https://observablehq.com/@d3/streamgraph

- D3 Chord diagram example: https://observablehq.com/@d3/chord-diagram

- D3 Calendar / Heatmap example: https://observablehq.com/@d3/calendar

- D3 Small Multiples example: https://observablehq.com/@d3/small-multiples

- D3 Bisect / Crosshair tooltip: https://observablehq.com/@d3/line-chart-with-tooltip

- D3 Stack / Area chart: https://observablehq.com/@d3/stacked-area-chart

- Scrollama.js: https://github.com/russellsamora/scrollama

- "How to Implement Scrollytelling with Six Different Libraries" — The Pudding: https://pudding.cool/process/how-to-implement-scrollytelling/

- Intersection Observer API: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

- CSS color-mix(): https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix

- CSS clamp(): https://developer.mozilla.org/en-US/docs/Web/CSS/clamp

- SVG clipPath: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/clipPath

- Google Fonts: https://fonts.google.com/

- Dataset: Air Traffic Passenger Statistics — SF Airport Commission via DataSF Open Data Portal: https://data.sfgov.org/Transportation/Air-Traffic-Passenger-Statistics/rkru-6vcg

- Claude AI used to parse Activity_Period into a date format, filter to Enplaned rows, and confirm the totals look right. Clean up airline naming inconsistencies. Also used to make visualizations responsive to tablet/iphone devices. 

- Used Scrollama examples provided by Professor Joshi