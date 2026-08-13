/* global Module */

Module.register("MMM-Graphical-METAR-TAF", {
  defaults: {
    airport: "KPTK",
    updateInterval: 5 * 60 * 1000,
    animationSpeed: 800,
    showOfficialLinks: false,
  },

  requiresVersion: "2.22.0",

  start() {
    this.weather = null;
    this.error = null;
    this.loaded = false;
    this.sendConfiguration();
  },

  getStyles() {
    return ["MMM-Graphical-METAR-TAF.css"];
  },

  getScripts() {
    return [];
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "graphical-metar-taf";

    if (this.error) {
      wrapper.innerHTML = `<div class="gmt-message"><strong>Weather unavailable</strong><span>${this.escape(this.error)}</span></div>`;
      return wrapper;
    }

    if (!this.weather) {
      wrapper.innerHTML = '<div class="gmt-message"><strong>Loading aviation weather…</strong></div>';
      return wrapper;
    }

    wrapper.innerHTML = this.renderDashboard(this.weather);
    return wrapper;
  },

  socketNotificationReceived(notification, payload) {
    if (!payload || payload.identifier !== this.identifier) return;
    if (notification === "GMT_WEATHER") {
      this.weather = payload;
      this.error = null;
      this.loaded = true;
      this.updateDom(this.config.animationSpeed);
    }
    if (notification === "GMT_ERROR") {
      this.error = payload && payload.message ? payload.message : "Unable to retrieve aviation weather.";
      this.updateDom(this.config.animationSpeed);
    }
  },

  notificationReceived(notification, payload) {
    if (notification === "DOM_OBJECTS_CREATED") this.sendConfiguration();
    if (notification === "MMM_GRAPHICAL_METAR_TAF_REFRESH") {
      this.sendSocketNotification("GMT_REFRESH", { identifier: this.identifier });
    }
    if (notification === "MMM_GRAPHICAL_METAR_TAF_AIRPORT" && payload) {
      this.config.airport = this.station(payload);
      this.sendConfiguration();
    }
  },

  sendConfiguration() {
    this.sendSocketNotification("GMT_CONFIG", {
      identifier: this.identifier,
      airport: this.station(this.config.airport),
      updateInterval: Math.max(60 * 1000, Number(this.config.updateInterval) || 5 * 60 * 1000),
    });
  },

  station(value) {
    const id = String(value || "KPTK").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    return /^[A-Z0-9]{3,4}$/.test(id) ? id : "KPTK";
  },

  escape(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[character]);
  },

  angleDiff(a, b) {
    return Math.abs(((a - b + 540) % 360) - 180);
  },

  favoredEnd(pair, wind) {
    return pair.ends.slice().sort((a, b) => this.angleDiff(wind, a.heading) - this.angleDiff(wind, b.heading))[0];
  },

  components(speed, wind, heading) {
    const angle = this.angleDiff(wind, heading) * Math.PI / 180;
    return { head: Math.round(speed * Math.cos(angle)), cross: Math.round(Math.abs(speed * Math.sin(angle))) };
  },

  cloudCount(cover, compact) {
    const counts = compact
      ? { FEW: 3, SCT: 5, BKN: 8, OVC: 11, VV: 11 }
      : { FEW: 6, SCT: 10, BKN: 15, OVC: 22, VV: 22 };
    return counts[cover] || 0;
  },

  cloudMarkup(count) {
    return Array.from({ length: count }, () => "<i></i>").join("");
  },

  chevrons() {
    return Array.from({ length: 19 }, () => "<i></i>").join("");
  },

  threshold() {
    return `<div class="gmt-threshold">${Array.from({ length: 8 }, () => "<i></i>").join("")}</div>`;
  },

  category(forecast) {
    const visibility = Number.parseFloat(String(forecast.visib)) || 10;
    const ceiling = (forecast.clouds || []).find((cloud) => ["BKN", "OVC", "VV"].includes(cloud.cover));
    const base = ceiling ? ceiling.base : Infinity;
    if (base < 500 || visibility < 1) return "LIFR";
    if (base < 1000 || visibility < 3) return "IFR";
    if (base <= 3000 || visibility <= 5) return "MVFR";
    return "VFR";
  },

  time(value, includeDate) {
    const date = new Date(typeof value === "number" ? value * 1000 : value);
    const options = includeDate
      ? { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }
      : { timeZone: "UTC", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false };
    return new Intl.DateTimeFormat("en-US", options).format(date).replace(",", "");
  },

  weatherName(code) {
    if (!code) return "No significant weather";
    const names = { BR: "Mist", FG: "Fog", RA: "Rain", SHRA: "Rain showers", TSRA: "Thunderstorms", SN: "Snow" };
    return String(code).split(" ").map((item) => names[item] || item).join(" · ");
  },

  crosswindLevel(crosswind) {
    return crosswind >= 15 ? "danger" : crosswind >= 10 ? "caution" : "normal";
  },

  runwayRows(runways, direction, speed) {
    const rows = (runways || []).map((pair) => {
      const end = this.favoredEnd(pair, direction);
      return Object.assign({}, pair, { end }, this.components(speed, direction, end.heading));
    }).sort((a, b) => b.length - a.length);
    return rows.filter((row, index) => rows.findIndex((other) => {
      const difference = this.angleDiff(row.ends[0].heading, other.ends[0].heading);
      return Math.min(difference, Math.abs(180 - difference)) < 5;
    }) === index);
  },

  windsock(speed, angle, side) {
    const stiff = Math.min(4, Math.floor(speed / 3));
    let segments = "";
    for (let index = 3; index >= 0; index -= 1) {
      const color = index % 2 === 0 ? "orange" : "white";
      const state = index < stiff ? "stiff" : "droop";
      segments = `<i class="gmt-sock-segment segment-${index + 1} ${state} ${color}">${segments}</i>`;
    }
    return `<div class="gmt-windsock ${side}" style="--sock-angle:${angle}deg" aria-label="${speed} knot windsock, ${stiff} of 4 segments inflated"><span class="gmt-windsock-pole"></span><div class="gmt-windsock-vane">${segments}</div></div>`;
  },

  runwayScene(row, direction, speed, windsock) {
    const relative = ((direction - row.end.heading + 540) % 360) - 180;
    const side = relative <= 0 ? "left" : "right";
    const level = this.crosswindLevel(row.cross);
    const angle = direction - row.end.heading + 90;
    return `<article class="gmt-runway-view">
      <span class="gmt-orientation">Runway ${this.escape(row.id)}</span>
      ${speed > 0 ? `<div class="gmt-wind ${level}" style="transform:rotate(${angle}deg)">${this.chevrons()}</div>` : ""}
      <div class="gmt-runway"><i class="gmt-centerline"></i><b>${this.escape(row.end.name)}</b>${this.threshold()}</div>
      <strong class="gmt-crosswind ${level} ${side}"><span>${row.cross} kt</span><span>x-wind</span></strong>
      ${windsock ? this.windsock(speed, angle, side === "left" ? "right" : "left") : ""}
      <footer>${row.head >= 0 ? `${row.head} kt headwind` : `${Math.abs(row.head)} kt tailwind`}</footer>
    </article>`;
  },

  forecastCard(forecast, index, runways) {
    const category = this.category(forecast);
    const direction = typeof forecast.wdir === "number" ? forecast.wdir : null;
    const speed = forecast.wspd || 0;
    const primary = (runways || []).slice().sort((a, b) => b.length - a.length)[0];
    if (!primary) return "";
    const end = direction === null ? primary.ends[1] : this.favoredEnd(primary, direction);
    const parts = this.components(speed, direction === null ? end.heading : direction, end.heading);
    const relative = direction === null ? 0 : ((direction - end.heading + 540) % 360) - 180;
    const side = relative <= 0 ? "left" : "right";
    const level = this.crosswindLevel(parts.cross);
    const ceiling = (forecast.clouds || []).find((cloud) => ["BKN", "OVC", "VV"].includes(cloud.cover));
    const clouds = (forecast.clouds || []).map((cloud) => `<div class="${this.escape(cloud.cover.toLowerCase())}">${this.cloudMarkup(this.cloudCount(cloud.cover, true))}<span>${this.escape(cloud.cover)} ${Number(cloud.base || 0).toLocaleString()} ft</span></div>`).join("");
    const from = this.time(forecast.timeFrom, false);
    const to = this.time(forecast.timeTo, false).replace(/^\w+\s/, "");
    return `<article class="gmt-forecast-card ${forecast.fcstChange === "TEMPO" ? "temporary" : ""}">
      <header><span class="gmt-category ${category.toLowerCase()}">${category}</span><div><time>${from}–${to}</time><strong>${this.escape(forecast.fcstChange || `Period ${index + 1}`)}</strong></div></header>
      <div class="gmt-forecast-scene">
        <div class="gmt-forecast-clouds">${clouds}</div>
        ${direction !== null && speed > 0 ? `<div class="gmt-forecast-wind ${level}" style="transform:rotate(${direction - end.heading + 90}deg)">${this.chevrons()}</div>` : ""}
        <div class="gmt-forecast-runway"><i class="gmt-centerline"></i><b>${this.escape(end.name)}</b>${this.threshold()}</div>
        ${direction !== null ? `<strong class="gmt-forecast-crosswind ${level} ${side}"><span>${parts.cross} kt</span><span>x-wind</span></strong>` : ""}
      </div>
      <div class="gmt-forecast-stats">
        <div><span>Wind</span><strong>${direction === null ? "VRB" : `${direction}°`} · ${speed}${forecast.wgst ? `G${forecast.wgst}` : ""} kt</strong></div>
        <div><span>Visibility</span><strong>${this.escape(forecast.visib)} mi</strong></div>
        <div><span>Ceiling</span><strong>${ceiling ? `${Number(ceiling.base).toLocaleString()} ft` : "Unlimited"}</strong></div>
        <div><span>Weather</span><strong>${this.escape(this.weatherName(forecast.wxString))}</strong></div>
      </div>
      <footer><span>Primary runway</span><strong>${this.escape(direction === null ? primary.id : end.name)}</strong>${forecast.fcstChange === "TEMPO" ? "<em>Temporary</em>" : ""}</footer>
    </article>`;
  },

  renderDashboard(data) {
    const metar = data.metar;
    const taf = data.taf;
    const airport = data.airport;
    const direction = typeof metar.wdir === "number" ? metar.wdir : 0;
    const ceiling = (metar.clouds || []).find((cloud) => ["BKN", "OVC", "VV"].includes(cloud.cover));
    const topCloud = (metar.clouds || []).slice(-1)[0];
    const coverNames = { CLR: "Clear", SKC: "Clear", FEW: "Few", SCT: "Scattered", BKN: "Broken", OVC: "Overcast", VV: "Vertical visibility" };
    const runways = this.runwayRows(airport.runways, direction, metar.wspd || 0);
    const clouds = (metar.clouds || []).map((cloud) => `<div class="gmt-cloud-layer ${this.escape(cloud.cover.toLowerCase())}" style="bottom:${58 + Math.min(34, ((cloud.base || 0) / 30000) * 34)}%"><div>${this.cloudMarkup(this.cloudCount(cloud.cover, false))}</div><b>${this.escape(cloud.cover)} ${Number(cloud.base || 0).toLocaleString()} ft</b></div>`).join("");
    const age = Math.max(0, Math.floor((Date.now() - new Date(metar.reportTime).getTime()) / 60000));
    const forecasts = taf && taf.fcsts ? taf.fcsts.map((forecast, index) => this.forecastCard(forecast, index, airport.runways)).join("") : '<div class="gmt-message">No current TAF is published.</div>';
    const officialLink = this.config.showOfficialLinks ? `<a href="https://aviationweather.gov/data/taf/?ids=${encodeURIComponent(metar.icaoId)}&metar=0&taf=1" target="_blank">Official TAF ↗</a>` : "";

    return `<header class="gmt-header"><h1>METAR ${this.escape(metar.icaoId)} <span>· ${this.escape(airport.name)}</span></h1><div><span>${this.time(metar.reportTime, true)} Z</span><span class="gmt-live">● LIVE · ${age}m</span></div></header>
      <section class="gmt-summary">
        <article class="green"><strong>${this.escape(metar.fltCat || "—")}</strong><span>Flight category</span></article>
        <article><strong>${Math.round((metar.temp * 9) / 5 + 32)} °F</strong><span>${this.escape(topCloud ? coverNames[topCloud.cover] || topCloud.cover : "Clear")}</span></article>
        <article class="green"><strong>${metar.wspd || 0}${metar.wgst ? `G${metar.wgst}` : ""} kt</strong><span>${typeof metar.wdir === "number" ? `${metar.wdir}°` : "Variable"}</span></article>
        <article class="green"><strong>${this.escape(metar.visib)} mi</strong><span>Visibility</span></article>
        <article class="green"><strong>${ceiling ? `${Number(ceiling.base).toLocaleString()} ft` : "Unlimited"}</strong><span>Ceiling</span></article>
        <article><strong>${(Number(metar.altim) / 33.8639).toFixed(2)} inHg</strong><span>Altimeter</span></article>
      </section>
      <section class="gmt-current"><header><div><span>Current METAR visualization</span><strong>${typeof metar.wdir === "number" ? `${metar.wdir}°` : "VRB"} at ${metar.wspd || 0}${metar.wgst ? `G${metar.wgst}` : ""} kt</strong></div><div><span>Visibility</span><strong>${this.escape(metar.visib)} mi</strong></div><div><span>Ceiling</span><strong>${ceiling ? `${Number(ceiling.base).toLocaleString()} ft` : "Unlimited"}</strong></div></header><div class="gmt-current-scene">${clouds}<div class="gmt-runway-grid">${runways.map((row) => this.runwayScene(row, direction, metar.wspd || 0, true)).join("")}</div></div></section>
      <section class="gmt-taf"><header><div><h2>${this.escape(metar.icaoId)} forecast periods</h2><span>${taf ? `Issued ${this.time(taf.issueTime, true)} Z` : "No current TAF available"}</span></div>${officialLink}</header><div class="gmt-forecast-grid">${forecasts}</div></section>`;
  },
});
