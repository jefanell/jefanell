Module.register("MMM-MetarRunway", {
  defaults: {
    airport: "KPTK",
    appUrl: "http://localhost:3000/",
    width: "1920px",
    height: "1080px",
  },

  requiresVersion: "2.22.0",

  getStyles: function () {
    return ["MMM-MetarRunway.css"];
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-metar-runway-wrapper";
    wrapper.style.width = this.config.width;
    wrapper.style.height = this.config.height;

    const frame = document.createElement("iframe");
    const baseUrl = String(this.config.appUrl || "http://localhost:3000/").replace(/\/+$/, "");
    const airport = String(this.config.airport || "KPTK")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);

    frame.className = "mmm-metar-runway-frame";
    frame.src = `${baseUrl}/mirror?airport=${encodeURIComponent(airport || "KPTK")}`;
    frame.title = `${airport || "KPTK"} METAR and TAF runway weather`;
    frame.setAttribute("loading", "eager");
    frame.setAttribute("referrerpolicy", "no-referrer");
    wrapper.appendChild(frame);
    return wrapper;
  },
});
