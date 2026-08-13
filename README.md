# METAR Runway Dashboard

A locally served graphical METAR and TAF dashboard with runway-relative wind visualization, E6B-style wind components, cloud layers, four-segment windsocks, and a companion MagicMirror² module.

Weather and airport metadata are loaded from the public [Aviation Weather Center Data API](https://aviationweather.gov/data/api/). No API key is required.

## Features

- Change airports by ICAO/FAA identifier from the header.
- Loads current METAR, TAF periods, airport name, and true runway alignments.
- Consolidates parallel runways into one representative orientation.
- Calculates headwind and crosswind components against true runway headings.
- Depicts runway-relative wind direction with chevrons and warning colors.
- Shows cloud coverage, ceiling, visibility, flight category, and altimeter.
- Includes a responsive MagicMirror presentation route and installable module.

## Local development

Requires Node.js 22 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open:

- Standard dashboard: `http://localhost:3000/`
- MagicMirror preview: `http://localhost:3000/mirror?airport=KPTK`

Validate a production build with:

```bash
pnpm build
```

## Airport selection

Use the airport field in the upper-right corner, or provide an initial airport in the URL:

```text
http://localhost:3000/?airport=KDTW
http://localhost:3000/mirror?airport=KDTW
```

The airport API supplies the runway identifiers, lengths, and true alignments used by the wind calculations and graphics.

## MagicMirror²

The module source is in [`magicmirror/MMM-MetarRunway`](magicmirror/MMM-MetarRunway). Copy that directory to the MagicMirror `modules` directory, keep this dashboard server available to the mirror, and add the following to `config/config.js`:

```js
{
  module: "MMM-MetarRunway",
  position: "fullscreen_above",
  config: {
    airport: "KPTK",
    appUrl: "http://localhost:3000/",
    width: "1920px",
    height: "1080px"
  }
}
```

If the dashboard runs on a different device, change `appUrl` to that device's LAN address. See the module's [README](magicmirror/MMM-MetarRunway/README.md) for details.

## Data notes

- METAR and TAF wind directions are true.
- Airport runway alignments from the Aviation Weather Center airport endpoint are also true.
- Crosswind is calculated as `wind speed × sin(relative wind angle)`.
- Headwind is calculated as `wind speed × cos(relative wind angle)`.
- Variable winds do not receive a directional component calculation.

This dashboard is for situational awareness and is not a substitute for official preflight planning or operational weather products.
