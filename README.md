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
    height: "1080px",
    webServerEnabled: true,
    webServerAddress: "0.0.0.0",
    webServerPort: 3000
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
| `width` | `"1920px"` | Exact dashboard viewport width. Accepts pixels or a CSS length such as `"80vw"` or `"100%"`. |
| `height` | `"1080px"` | Exact dashboard viewport height. |
| `webServerEnabled` | `true` | Serve the same dashboard as a separate web page for LAN devices. |
| `webServerAddress` | `"0.0.0.0"` | Listen on every Linux network interface. Use `"127.0.0.1"` for local-only access. |
| `webServerPort` | `3000` | Port for the separate standalone dashboard. This does not change MagicMirror's normal port. |

The display includes current flight category, temperature, wind, visibility, ceiling, altimeter, runway-relative headwind/crosswind components, four-section windsocks, cloud layers, and graphical TAF periods. Parallel runways are consolidated into one orientation.

The complete dashboard is rendered on a high-resolution canvas and uniformly scaled to the largest size that fits within both `width` and `height`. Nothing is cropped, and the aspect ratio is preserved. Scaling is recalculated after each weather update and whenever the MagicMirror browser is resized.
During initial MagicMirror startup, the module continues measuring while regions, fonts, and animations settle. It also watches its container for later layout changes, so manual browser zooming should not be necessary.

## Separate LAN web page

By default, the module starts a second HTTP server at:

```text
http://<MAGICMIRROR-LINUX-IP>:3000/
```

This is independent of MagicMirror's own server, which can remain on port 8080. If Linux uses UFW, allow the standalone page once with `sudo ufw allow 3000/tcp`. Set `webServerEnabled: false` if you do not want the second server.

## Update

```bash
cd ~/MagicMirror/modules/MMM-Graphical-METAR-TAF
git pull
```

## Notes

- MagicMirror must have internet access to `aviationweather.gov`.
- The module requires MagicMirror² 2.22 or newer.
- Aviation weather is advisory. Use official briefing sources for operational decisions.
