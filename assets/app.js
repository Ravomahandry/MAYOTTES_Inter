require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
  "esri/geometry/Point",
  "esri/core/promiseUtils"
], function (
  Map,
  MapView,
  GraphicsLayer,
  Graphic,
  Point,
  promiseUtils
) {
  // =========================================================
  // 1) OUTILS
  // =========================================================

  function escapeHtml(value) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function dmsToDecimal(dms) {
    if (!dms || typeof dms !== "string") return null;

    const clean = dms.trim().replace(/\s+/g, "");
    const match = clean.match(/^(\d+)°(\d+)'([\d.]+)"?([NSEW])$/i);

    if (!match) return null;

    const degrees = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    const hemisphere = match[4].toUpperCase();

    let decimal = degrees + minutes / 60 + seconds / 3600;

    if (hemisphere === "S" || hemisphere === "W") {
      decimal *= -1;
    }

    return Number(decimal.toFixed(6));
  }

  function normalizeSite(site) {
    return {
      ...site,
      latitude: dmsToDecimal(site.latitude_dms),
      longitude: dmsToDecimal(site.longitude_dms)
    };
  }

  function buildPopupContent(attrs) {
    const algues =
      Array.isArray(attrs.algues) && attrs.algues.length
        ? attrs.algues.join(", ")
        : "—";

    const rows = [
      ["Date de prélèvement", attrs.date_prelevement],
      ["Localisation", attrs.localisation],
      ["Latitude (DMS)", attrs.latitude_dms],
      ["Longitude (DMS)", attrs.longitude_dms],
      ["État global", attrs.etat_global],
      ["Flux sédimentaire", attrs.flux_sedimentaire],
      ["État chimique", attrs.etat_chimique],
      ["Densité de population", attrs.densite_population],
      ["Fréquentation du lagon", attrs.frequentation_lagon],
      ["Activités touristiques", attrs.activites_touristiques],
      ["Patrimoine naturel", attrs.patrimoine_naturel],
      ["Turbidité", attrs.turbidite],
      ["État du récif", attrs.etat_recif],
      ["Température", attrs.temperature],
      ["Algues supposées", algues]
    ];

    return `
      <div class="popup-grid">
        ${rows
          .map(
            ([label, value]) =>
              `<div><span class="popup-label">${escapeHtml(label)} :</span> ${escapeHtml(value)}</div>`
          )
          .join("")}
      </div>
    `;
  }

  // =========================================================
  // 2) CARTE
  // =========================================================

  const map = new Map({
    basemap: "satellite"
  });

  const graphicsLayer = new GraphicsLayer();
  map.add(graphicsLayer);

  const view = new MapView({
    container: "viewDiv",
    map,
    center: [45.15, -12.85],
    zoom: 10,
    popup: {
      autoOpenEnabled: false,
      dockEnabled: false,
      collapseEnabled: true
    }
  });

  const markerSymbol = {
    type: "simple-marker",
    style: "circle",
    color: "#facc15",
    size: 10,
    outline: {
      color: "#111827",
      width: 1.5
    }
  };

  function createGraphic(site) {
    return new Graphic({
      geometry: new Point({
        longitude: site.longitude,
        latitude: site.latitude
      }),
      symbol: markerSymbol,
      attributes: site,
      popupTemplate: {
        title: `Site ${site.site_id} — ${site.localisation || "Sans nom"}`,
        content: buildPopupContent(site)
      }
    });
  }

  // =========================================================
  // 3) INTERFACE LISTE
  // =========================================================

  function renderList(sites) {
    const list = document.getElementById("siteList");
    list.innerHTML = "";

    if (!sites.length) {
      list.innerHTML = "<li>Aucun résultat.</li>";
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const site of sites) {
      const li = document.createElement("li");
      const button = document.createElement("button");

      button.innerHTML = `
        <div class="site-title">Site ${escapeHtml(site.site_id)} — ${escapeHtml(site.localisation)}</div>
        <div class="site-subtitle">${escapeHtml(site.date_prelevement)}</div>
      `;

      button.addEventListener("click", () => {
        const graphic = graphicsLayer.graphics.find(
          (g) => g.attributes.site_id === site.site_id
        );

        if (!graphic) return;

        view.goTo({
          center: [site.longitude, site.latitude],
          zoom: 13
        });

        view.popup.open({
          location: graphic.geometry,
          features: [graphic]
        });
      });

      li.appendChild(button);
      fragment.appendChild(li);
    }

    list.appendChild(fragment);
  }

  // =========================================================
  // 4) DONNÉES
  // =========================================================

  const normalizedSites = window.SITES_DATA
    .map(normalizeSite)
    .filter(
      (site) =>
        Number.isFinite(site.latitude) &&
        Number.isFinite(site.longitude) &&
        site.localisation
    );

  document.getElementById("stats").textContent =
    `${normalizedSites.length} sites géolocalisés affichés.`;

  normalizedSites.forEach((site) => {
    graphicsLayer.add(createGraphic(site));
  });

  renderList(normalizedSites);

  view.when(() => {
    if (graphicsLayer.graphics.length > 0) {
      view.goTo(graphicsLayer.graphics.toArray()).catch(() => {});
    }
  });

  // =========================================================
  // 5) RECHERCHE
  // =========================================================

  document.getElementById("searchInput").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();

    const filtered = !query
      ? normalizedSites
      : normalizedSites.filter((site) => {
          return (
            (site.site_id || "").toLowerCase().includes(query) ||
            (site.localisation || "").toLowerCase().includes(query)
          );
        });

    renderList(filtered);
  });

  // =========================================================
  // 6) POPUP AU SURVOL
  // =========================================================

  const hoverPopup = promiseUtils.debounce(async (event) => {
    const hitResponse = await view.hitTest(event);

    const siteHit = hitResponse.results.find(
      (result) => result.graphic && result.graphic.layer === graphicsLayer
    );

    if (siteHit) {
      const graphic = siteHit.graphic;
      view.container.style.cursor = "pointer";

      view.popup.open({
        location: graphic.geometry,
        features: [graphic]
      });
    } else {
      view.container.style.cursor = "default";
      view.popup.close();
    }
  });

  view.on("pointer-move", (event) => {
    hoverPopup(event).catch(() => {});
  });

  view.on("pointer-leave", () => {
    view.container.style.cursor = "default";
    view.popup.close();
  });
});