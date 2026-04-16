# SFO Air Traffic Passenger Trends

> CS 360 Final Project

> A data visualization project exploring how major disruptions shaped passenger traffic at San Francisco International Airport from 2005 to the present.

**Author:** Geneva Tovar
**Course:** CS 360 Spring 2026

## Background & Motivation

As a frequent SFO flyer, I have a personal connection to this airport and an interest in understanding how it has performed over time. SFO is consistently ranked among the best airports in the United States, known for unique amenities like museum exhibits, sensory rooms, and high-quality dining. However, behind that reputation is a passenger traffic story shaped by forces completely outside the airport's control.

This project explores how a major airport like SFO holds up during large-scale disruptions, and what recovery actually looks like in the data.

---

## Project Objectives

This project visualizes monthly SFO passenger traffic data from 2005 to the present to answer three questions:

1. **Crisis impact and recovery** — How did major historical crises, including the 2008 recession and the COVID-19 pandemic, disrupt passenger traffic at SFO, and how long did each recovery take?
2. **Domestic vs. international recovery** — Did domestic and international passenger traffic recover at different rates after each disruption? Which segment of air travel is more vulnerable during a crisis?
3. **Airline landscape shifts** — Which airlines shrank, exited, or grew their presence at SFO after each crisis?

---

## Data

**Source:** [Air Traffic Passenger Statistics](https://data.sfgov.org/) published by the SF Airport Commission through the DataSF open data portal.

The dataset contains monthly traffic records at SFO from July 2005 through the present, updated quarterly.

**Key columns used:**

| Column | Description |
|---|---|
| `Activity_Period` | Year and month of record (e.g., `202012` for December 2020) |
| `Operating_Airline` | Airline operating the flight |
| `Published_Airline` | Airline name as published |
| `GEO_Summary` | Domestic or International |
| `GEO_Region` | US, Asia, Europe, Canada, Mexico, etc. |
| `Activity_Type_Code` | Enplaned, Deplaned, or Thru/Transit |
| `Terminal` | Airport terminal |
| `Passenger_Count` | Number of passengers |

---

## Data Processing

The dataset is relatively clean, but requires the following preprocessing steps:

- **Date parsing** — `Activity_Period` stores dates as a six-digit integer and will be parsed into a proper date format for time-series plotting.
- **Filtering** — Rows are filtered to `Activity_Type_Code = "Enplaned"` to avoid double-counting passengers across terminals and regions.
- **Airline standardization** — Inconsistent airline names due to rebranding or mergers will be normalized.

**Derived quantities:**

- Monthly total passenger counts aggregated across all airlines and terminals
- Monthly domestic vs. international passenger counts using `GEO_Summary`
- Per-airline monthly passenger counts to track individual carrier trends
- Year-over-year percentage change to measure recovery speed
- Crisis windows: 2008 recession (approx. September 2008 – June 2009) and COVID-19 (March 2020 – present)

---

## Tools & Implementation

Data processing is implemented in JavaScript using D3.js:

- `d3.csv()` to load the raw CSV file
- Parsing and filtering handled in-browser
- `d3.rollup()` and `d3.group()` for aggregation

---

## Visualization Design

### Format: Scrollytelling

The user scrolls through a guided story about SFO's passenger traffic history, with each step revealing a new visualization and a short narrative caption. This format suits the data well because each crisis has a clear before, during, and after arc that benefits from pacing.

### Three Prototype Designs

**Design 1 — Single annotated line chart**
One continuous line showing total monthly passenger count from 2005 to present, with shaded crisis bands and text labels for key events. Simple and readable at a glance. Does not break down domestic vs. international or individual airlines.

**Design 2 — Small multiples**
Two side-by-side line charts, one domestic and one international, on a shared y-axis scale with aligned crisis bands. Directly addresses Objective 2 by making recovery rate differences easy to compare. Takes up more space and loses the unified total-traffic view.

**Design 3 — Stacked area chart by airline**
Top 5–6 airlines at SFO shown as stacked colored layers over time. Good for showing how the carrier mix shifted, addressing Objective 3. Can get visually cluttered and makes precise per-airline values harder to read.

### Final Design

The final design combines all three prototypes into a scrollytelling flow:

1. **Step 1** — Design 1's annotated line chart establishes the full traffic picture
2. **Step 2** — Design 2's small multiples compare domestic vs. international recovery
3. **Step 3** — A simplified version of Design 3 shows the airline market story

Visual encoding decisions:
- Position on a shared y-axis encodes passenger count (most accurate for quantity comparison)
- Color encodes geographic segment or airline, kept minimal to avoid clutter
- Shaded bands and annotations mark crisis periods without competing with trend lines

---

## Five Design Sheet Methodology

| Sheet | Content |
|---|---|
| Sheet 1 | Initial ideas and filtering |
| Sheets 2–4 | One alternative design each, with layout, data, and interaction details |
| Sheet 5 | Final combined design |

---

## Features

### Must-Have

- Annotated time-series line chart of total monthly SFO passenger volume (2005–present) with shaded crisis windows and event labels *(Objective 1)*
- Small multiples comparing domestic vs. international traffic over the same period, with aligned crisis bands *(Objective 2)*
- Per-airline trend view of top airlines as a stacked area chart *(Objective 3)*
- Scrollytelling structure with narrative captions at each step

### Optional

- Hover tooltips with exact passenger count, month, and airline
- Brush or zoom interaction to isolate a specific crisis window
- Dropdown to view one airline's full trend in isolation
- Year-over-year percentage change chart as a secondary panel
- Smooth animated transitions between scroll steps
- Mobile-responsive layout

---

## Project Schedule

| Week | Dates | Goal | Deliverable |
|---|---|---|---|
| 1 | Apr 7–13 | Download dataset, parse dates, filter to Enplaned rows, clean airline names | Clean CSV ready for visualization |
| 2 | Apr 14–20 | Finish proposal, complete FDS sketches, submit | Submitted proposal with all sections and sketches |
| 3 | Apr 21–27 | Set up scrollytelling structure, build annotated line chart with crisis bands | First scroll step working in browser |
| 4 | Apr 28–May 4 | Build domestic vs. international small multiples, wire into scroll flow | Second scroll step working |
| 5 | May 5–11 | Build airline stacked area chart, write all narrative captions | All three visualizations complete, full scroll flow working end to end *(Presentation May 11)* |
| 6 | May 12–17 | Polish layout, colors, typography; add tooltips; start project report | Polished draft and report outline *(Report draft due May 17)* |
| 7 | May 18–20 | Final testing, proofread captions, finish and submit report | Final project submitted May 20 |

## SOURCES:
- ClaudeAI used to parse Activity_Period into a date format, filter to Enplaned rows, and confirm the totals look right. Clean up airline naming inconsistencies. Build the chord diagram data structure (source-target pairs by region and year). 