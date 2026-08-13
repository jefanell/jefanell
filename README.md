# MMM-MetarRunway

A MagicMirror² wrapper for the graphical METAR/TAF runway dashboard. The module and local browser preview share the same web app, so visual and calculation changes never need to be duplicated.

## Install

Clone the module directly into the MagicMirror `modules` directory:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/jefanell/jefanell.git MMM-MetarRunway
```

Clone URL: [`https://github.com/jefanell/jefanell.git`](https://github.com/jefanell/jefanell.git)

To download future updates:

```bash
cd ~/MagicMirror/modules/MMM-MetarRunway
git pull
```

Keep the dashboard web server running on the same device as MagicMirror at `http://localhost:3000/`. If it runs on another device, set `appUrl` to that device's LAN URL.

## config.js

Add this entry to the `modules` array in `~/MagicMirror/config/config.js`:

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

Change `airport` to any 3- or 4-character airport identifier supported by AviationWeather.gov. The dashboard loads that airport's METAR, TAF, name, runway alignments, and runway lengths.

## Local previews

- Standard editable page: `http://localhost:3000/`
- Mirror presentation: `http://localhost:3000/mirror?airport=KPTK`
- Another airport: `http://localhost:3000/mirror?airport=KDTW`

The standard page retains the airport picker. Mirror mode hides the picker because its value comes from `config.js`.
