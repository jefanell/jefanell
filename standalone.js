(function () {
  const definition = window.GraphicalMetarTafDefinition;
  const root = document.getElementById("standalone-root");
  const dashboard = Object.create(definition);
  dashboard.identifier = "standalone";
  dashboard.config = Object.assign({}, definition.defaults, {
    width: "100vw",
    height: "100vh",
  });
  dashboard.sendConfiguration = function () {};
  dashboard.sendSocketNotification = function () {};
  dashboard.updateDom = render;

  function render() {
    root.replaceChildren(dashboard.getDom());
  }

  async function refresh() {
    try {
      const response = await fetch("/api/weather", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Weather data is unavailable.");
      if (payload.webConfig) Object.assign(dashboard.config, payload.webConfig);
      dashboard.weather = payload;
      dashboard.error = null;
      render();
    } catch (error) {
      dashboard.error = error instanceof Error ? error.message : "Weather data is unavailable.";
      render();
    }
  }

  dashboard.start();
  render();
  refresh();
  window.setInterval(refresh, Math.max(60000, dashboard.config.updateInterval));
}());
