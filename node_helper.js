const NodeHelper = require("node_helper");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DEFAULT_RUNWAYS = [
  { id: "09R/27L", ends: [{ name: "09R", heading: 88 }, { name: "27L", heading: 268 }], length: 6521 },
  { id: "09L/27R", ends: [{ name: "09L", heading: 88 }, { name: "27R", heading: 268 }], length: 5676 },
  { id: "18/36", ends: [{ name: "18", heading: 172 }, { name: "36", heading: 352 }], length: 2582 },
];

module.exports = NodeHelper.create({
  start() {
    this.instances = new Map();
    this.webServer = null;
    this.webServerSettings = null;
  },

  stop() {
    this.instances.forEach((instance) => clearInterval(instance.timer));
    this.instances.clear();
    if (this.webServer) this.webServer.close();
    this.webServer = null;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "GMT_CONFIG") this.configure(payload);
    if (notification === "GMT_REFRESH" && payload && payload.identifier) this.refresh(payload.identifier);
  },

  configure(payload) {
    if (!payload || !payload.identifier) return;
    const previous = this.instances.get(payload.identifier);
    if (previous) clearInterval(previous.timer);
    const instance = {
      airport: this.station(payload.airport),
      interval: Math.max(60 * 1000, Number(payload.updateInterval) || 5 * 60 * 1000),
      showTaf: payload.showTaf !== false,
      timer: null,
      latest: previous ? previous.latest : null,
    };
    instance.timer = setInterval(() => this.refresh(payload.identifier), instance.interval);
    this.instances.set(payload.identifier, instance);
    if (payload.webServerEnabled !== false) {
      this.startWebServer(payload.webServerAddress, payload.webServerPort);
    } else if (this.webServer) {
      this.webServer.close();
      this.webServer = null;
      this.webServerSettings = null;
    }
    this.refresh(payload.identifier);
  },

  startWebServer(address, port) {
    const host = String(address || "0.0.0.0");
    const listenPort = Math.min(65535, Math.max(1, Number(port) || 3000));
    const settings = `${host}:${listenPort}`;
    if (this.webServer && this.webServerSettings === settings) return;
    if (this.webServer) {
      this.webServer.close(() => {
        this.webServer = null;
        this.createWebServer(host, listenPort);
      });
      return;
    }
    this.createWebServer(host, listenPort);
  },

  createWebServer(host, port) {
    const files = {
      "/": ["standalone.html", "text/html; charset=utf-8"],
      "/index.html": ["standalone.html", "text/html; charset=utf-8"],
      "/standalone.js": ["standalone.js", "text/javascript; charset=utf-8"],
      "/MMM-Graphical-METAR-TAF.js": ["MMM-Graphical-METAR-TAF.js", "text/javascript; charset=utf-8"],
      "/MMM-Graphical-METAR-TAF.css": ["MMM-Graphical-METAR-TAF.css", "text/css; charset=utf-8"],
    };
    this.webServer = http.createServer((request, response) => {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      if (url.pathname === "/api/weather") {
        const requestedAirport = url.searchParams.get("airport");
        const instance = Array.from(this.instances.values()).find((item) => (
          !requestedAirport || item.airport === this.station(requestedAirport)
        ));
        if (!instance || !instance.latest) {
          response.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          response.end(JSON.stringify({ error: "Weather data is still loading." }));
          return;
        }
        response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        response.end(JSON.stringify(instance.latest));
        return;
      }
      const asset = files[url.pathname];
      if (!asset) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      fs.readFile(path.join(__dirname, asset[0]), (error, contents) => {
        if (error) {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Unable to load the METAR dashboard.");
          return;
        }
        response.writeHead(200, { "Content-Type": asset[1], "Cache-Control": "no-cache" });
        response.end(contents);
      });
    });
    this.webServer.on("error", (error) => {
      console.error(`[MMM-Graphical-METAR-TAF] Standalone server failed on ${host}:${port}: ${error.message}`);
      this.webServer = null;
      this.webServerSettings = null;
    });
    this.webServer.listen(port, host, () => {
      this.webServerSettings = `${host}:${port}`;
      console.log(`[MMM-Graphical-METAR-TAF] Standalone dashboard listening on http://${host}:${port}`);
    });
  },

  station(value) {
    const id = String(value || "KPTK").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    return /^[A-Z0-9]{3,4}$/.test(id) ? id : "KPTK";
  },

  request(path, airport, optional) {
    const url = `https://aviationweather.gov/api/data/${path}?ids=${encodeURIComponent(airport)}&format=json`;
    return new Promise((resolve, reject) => {
      const request = https.get(url, { headers: { "User-Agent": "MMM-Graphical-METAR-TAF/1.0" } }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => { body += chunk; });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            if (optional) return resolve(null);
            return reject(new Error(`Aviation Weather returned ${response.statusCode} for ${path}`));
          }
          try {
            const result = JSON.parse(body);
            if (!result || !result[0]) {
              if (optional) return resolve(null);
              return reject(new Error(`No ${path.toUpperCase()} data was returned for ${airport}`));
            }
            return resolve(result[0]);
          } catch (error) {
            return reject(new Error(`Aviation Weather returned invalid ${path.toUpperCase()} data`));
          }
        });
      });
      request.setTimeout(15000, () => request.destroy(new Error(`Timed out retrieving ${path.toUpperCase()}`)));
      request.on("error", (error) => optional ? resolve(null) : reject(error));
    });
  },

  airportInfo(record, airport) {
    if (!record) return { icaoId: airport, name: airport, runways: airport === "KPTK" ? DEFAULT_RUNWAYS : [] };
    const runways = (record.runways || []).map((runway) => {
      const names = String(runway.id || "").split("/");
      const first = ((Number(runway.alignment) % 360) + 360) % 360 || 360;
      const reciprocal = (first + 180) % 360 || 360;
      return {
        id: runway.id,
        ends: [
          { name: names[0], heading: first },
          { name: names[1] || String(Math.round(reciprocal / 10)).padStart(2, "0"), heading: reciprocal },
        ],
        length: Number.parseInt(runway.dimension || "0", 10) || 0,
      };
    }).filter((runway) => runway.id && runway.ends[0].name);
    return { icaoId: record.icaoId || airport, name: String(record.name || airport).trim(), runways: runways.length ? runways : (airport === "KPTK" ? DEFAULT_RUNWAYS : []) };
  },

  async refresh(identifier) {
    const instance = this.instances.get(identifier);
    if (!instance || instance.loading) return;
    instance.loading = true;
    try {
      const [metar, taf, airportRecord] = await Promise.all([
        this.request("metar", instance.airport, false),
        this.request("taf", instance.airport, true),
        this.request("airport", instance.airport, true),
      ]);
      const airport = this.airportInfo(airportRecord, instance.airport);
      if (!airport.runways.length) throw new Error(`No runway information was returned for ${instance.airport}`);
      instance.latest = { identifier, metar, taf, airport, updatedAt: Date.now(), webConfig: { showTaf: instance.showTaf } };
      this.sendSocketNotification("GMT_WEATHER", instance.latest);
    } catch (error) {
      this.sendSocketNotification("GMT_ERROR", { identifier, message: error instanceof Error ? error.message : "Unable to retrieve aviation weather." });
    } finally {
      instance.loading = false;
    }
  },
});
