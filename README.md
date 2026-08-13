# MMM-Graphical-METAR-TAF

A standalone MagicMirror² module that fetches current METAR, TAF, airport, and runway data from AviationWeather.gov and renders graphical runway-relative weather. No separate web server, API key, iframe, or npm install is required.

## Install

```bash
cd ~/MagicMirror/modules
git clone https://github.com/jefanell/jefanell.git MMM-Graphical-METAR-TAF
```

Restart MagicMirror after installing the module.

## config.js

Add this entry to the `modules` array in `~/MagicMirror/config/config.js`:

```js
{
  module: "MMM-Graphical-METAR-TAF",
  position: "fullscreen_above",
  config: {
    airport: "KPTK",
    updateInterval: 5 * 60 * 1000,
    animationSpeed: 800,
    showOfficialLinks: false,
    width: "1920px",
    height: "1080px"
  }
}
```

### Options

| Option | Default | Description |
| --- | --- | --- |
| `airport` | `"KPTK"` | Three- or four-character airport identifier. |
| `updateInterval` | `300000` | Refresh interval in milliseconds; minimum one minute. |
| `animationSpeed` | `800` | MagicMirror DOM update animation in milliseconds. |
| `showOfficialLinks` | `false` | Show a link to the official TAF page. |
| `width` | `"1920px"` | Exact dashboard width. Accepts a number of pixels or a CSS length such as `"80vw"` or `"100%"`. |
| `height` | `"1080px"` | Exact dashboard height. Content outside this boundary is clipped. |

The display includes current flight category, temperature, wind, visibility, ceiling, altimeter, runway-relative headwind/crosswind components, four-section windsocks, cloud layers, and graphical TAF periods. Parallel runways are consolidated into one orientation.

## Update

```bash
cd ~/MagicMirror/modules/MMM-Graphical-METAR-TAF
git pull
```

## Notes

- MagicMirror must have internet access to `aviationweather.gov`.
- The module requires MagicMirror² 2.22 or newer.
- Aviation weather is advisory. Use official briefing sources for operational decisions.
