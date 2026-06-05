require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
  "esri/geometry/Point",
  "esri/core/promiseUtils",
  "esri/widgets/Legend",
  "esri/widgets/Expand"
], function (
  Map,
  MapView,
  GraphicsLayer,
  Graphic,
  Point,
  promiseUtils,
  Legend,
  Expand
) {
  // =========================================================
  // 0) COMPATIBILITÉ NAVIGATEURS
  // =========================================================
  
  console.log("🌐 Navigateur:", navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Edge") ? "Edge" : navigator.userAgent.includes("Opera") ? "Opera" : navigator.userAgent.includes("Safari") ? "Safari" : "Autre");
  
  // Fix pour Chrome et autres navigateurs
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  const isEdge = /Edg/.test(navigator.userAgent);
  const isOpera = /Opera/.test(navigator.userAgent) || /OPR\//.test(navigator.userAgent);

  // =========================================================
  // 1) CONFIGURATION GÉNÉRALE
  // =========================================================

  const map = new Map({
    basemap: "hybrid" // satellite + labels
  });

  const graphicsLayer = new GraphicsLayer({
    title: "Sites de prélèvements"
  });

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
    },
    // Compatibilité Chrome
    constraints: {
      minZoom: 5,
      maxZoom: 18,
      rotationEnabled: false
    }
  });

  // =========================================================
  // 1.5) GESTION MODAL DE RECHERCHE
  // =========================================================

  const searchModal = document.getElementById("searchModal");
  const searchToggle = document.getElementById("searchToggle");
  const searchClose = document.getElementById("searchClose");

  function openSearchModal() {
    searchModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeSearchModal() {
    searchModal.classList.remove("open");
    document.body.style.overflow = "auto";
  }

  searchToggle.addEventListener("click", openSearchModal);
  searchClose.addEventListener("click", closeSearchModal);

  // Fermer la modal en cliquant en dehors
  searchModal.addEventListener("click", (e) => {
    if (e.target === searchModal) {
      closeSearchModal();
    }
  });

  // Fermer avec Echap
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchModal.classList.contains("open")) {
      closeSearchModal();
    }
  });

  // =========================================================
  // 2) OUTILS
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

  function normalizeText(value) {
    return (value || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function dmsToDecimal(dms) {
    if (!dms || typeof dms !== "string") return null;

    const cleaned = dms
      .trim()
      .replace(/\s+/g, "")   // supprime espaces
      .replace(",", ".");    // sécurité

    const match = cleaned.match(/^(\d+)°(\d+)'([\d.]+)"?([NSEW])$/i);
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

  function parseEtatScore(etatGlobal) {
    // ex: "7/10" => 7
    if (!etatGlobal) return null;
    const match = String(etatGlobal).match(/^(\d+)/);
    return match ? Number(match[1]) : null;
  }

  // =========================================================
  // 3) COULEURS
  // =========================================================
  // Logique proposée :
  // - si score connu :
  //   0-3   = rouge
  //   4-5   = orange
  //   6-7   = jaune/vert
  //   8-10  = vert
  // - sinon, fallback par état chimique
  // - sinon, gris
  //
  // Dans le fichier Excel, on a explicitement des états globaux comme 7/10,
  // 4/10, ou X/10, ainsi que des états chimiques tels que Impacté, Dégradé,
  // Très dégradé, Potentiellement impacté. 【1-52ff42】

  function getColorByAttributes(site) {
    const score = parseEtatScore(site.etat_global);
    const etatChimique = normalizeText(site.etat_chimique);

    if (score !== null) {
      if (score >= 8) return "#16a34a";     // vert soutenu
      if (score >= 6) return "#84cc16";     // vert clair
      if (score >= 4) return "#f59e0b";     // orange
      return "#dc2626";                     // rouge
    }

    if (etatChimique.includes("tres degrade")) return "#7f1d1d"; // bordeaux
    if (etatChimique.includes("degrade")) return "#dc2626";      // rouge
    if (etatChimique.includes("impacte")) return "#f59e0b";      // orange
    if (etatChimique.includes("potentiellement impacte")) return "#facc15"; // jaune
    if (etatChimique.includes("bon")) return "#16a34a";          // vert

    return "#6b7280"; // gris = inconnu / non renseigné
  }

  function getOutlineColor(fillColor) {
    // contour légèrement plus foncé
    return "#111827";
  }

  function getSizeByAttributes(site) {
    const score = parseEtatScore(site.etat_global);

    // taille légèrement variable
    if (score !== null) {
      if (score >= 8) return 13;
      if (score >= 6) return 12;
      if (score >= 4) return 11;
      return 10;
    }

    return 10;
  }

  function getMarkerSymbol(site) {
    const color = getColorByAttributes(site);

    return {
      type: "simple-marker",
      style: "circle",
      color,
      size: getSizeByAttributes(site),
      outline: {
        color: getOutlineColor(color),
        width: 1.5
      }
    };
  }

  // =========================================================
  // 4) POPUP
  // =========================================================

  function buildPopupContent(site) {
    const algues =
      Array.isArray(site.algues) && site.algues.length
        ? site.algues.map(escapeHtml).join(", ")
        : "—";

    const rows = [
      ["Date de prélèvement", site.date_prelevement],
      ["Localisation", site.localisation],
      ["Latitude (DMS)", site.latitude_dms],
      ["Longitude (DMS)", site.longitude_dms],
      ["État global", site.etat_global],
      ["Flux sédimentaire", site.flux_sedimentaire],
      ["État chimique", site.etat_chimique],
      ["Densité de population", site.densite_population],
      ["Fréquentation du lagon", site.frequentation_lagon],
      ["Activités touristiques", site.activites_touristiques],
      ["Patrimoine naturel", site.patrimoine_naturel],
      ["Turbidité", site.turbidite],
      ["État du récif", site.etat_recif],
      ["Température", site.temperature],
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

  function createGraphic(site) {
    return new Graphic({
      geometry: new Point({
        longitude: site.longitude,
        latitude: site.latitude
      }),
      symbol: getMarkerSymbol(site),
      attributes: site,
      popupTemplate: {
        title: `Site ${site.site_id || "—"} — ${site.localisation || "Sans nom"}`,
        content: buildPopupContent(site)
      }
    });
  }

  // =========================================================
  // 5) LISTE LATÉRALE
  // =========================================================

  function renderList(sites) {
    const list = document.getElementById("siteList");
    if (!list) return;

    list.innerHTML = "";

    if (!sites.length) {
      list.innerHTML = "<li>Aucun résultat.</li>";
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const site of sites) {
      const li = document.createElement("li");
      const button = document.createElement("button");

      const color = getColorByAttributes(site);

      button.innerHTML = `
        <div class="site-title">
          <span style="
            display:inline-block;
            width:12px;
            height:12px;
            border-radius:999px;
            margin-right:8px;
            background:${color};
            border:1px solid #111827;
            vertical-align:middle;
          "></span>
          Site ${escapeHtml(site.site_id)} — ${escapeHtml(site.localisation)}
        </div>
        <div class="site-subtitle">
          ${escapeHtml(site.date_prelevement)} | État global : ${escapeHtml(site.etat_global || "—")}
        </div>
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
  // 6) LÉGENDE HTML SIMPLE
  // =========================================================

  function injectLegendHtml() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const card = document.createElement("section");
    card.className = "card";
    card.innerHTML = `
      <h2>Légende</h2>
      <div style="display:grid; gap:0.5rem;">
        <div><span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:#16a34a;border:1px solid #111827;margin-right:8px;"></span> Très bon / bon (score élevé)</div>
        <div><span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:#84cc16;border:1px solid #111827;margin-right:8px;"></span> Bon à moyen</div>
        <div><span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:#f59e0b;border:1px solid #111827;margin-right:8px;"></span> Impacté / moyen</div>
        <div><span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:#dc2626;border:1px solid #111827;margin-right:8px;"></span> Dégradé</div>
        <div><span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:#7f1d1d;border:1px solid #111827;margin-right:8px;"></span> Très dégradé</div>
        <div><span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:#6b7280;border:1px solid #111827;margin-right:8px;"></span> Non renseigné / X/10</div>
      </div>
    `;

    // insère la légende après le premier bloc si possible
    sidebar.appendChild(card);
  }

  // =========================================================
  // 7) CHARGEMENT DES DONNÉES
  // =========================================================

  let allSites = [];

  async function loadSites() {
    try {
      const response = await fetch("./data/sites.json");

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const rawSites = await response.json();

      // Transformation des coordonnées DMS -> décimales
      const normalizedSites = rawSites
        .map((site) => {
          const latitude = dmsToDecimal(site.latitude_dms);
          const longitude = dmsToDecimal(site.longitude_dms);

          return {
            ...site,
            latitude,
            longitude
          };
        })
        .filter(
          (site) =>
            Number.isFinite(site.latitude) &&
            Number.isFinite(site.longitude) &&
            site.localisation
        );

      allSites = normalizedSites;

      const stats = document.getElementById("stats");
      if (stats) {
        stats.textContent = `${normalizedSites.length} sites géolocalisés chargés.`;
      }

      normalizedSites.forEach((site) => {
        graphicsLayer.add(createGraphic(site));
      });

      renderList(normalizedSites);

      if (normalizedSites.length) {
        view.goTo(graphicsLayer.graphics.toArray()).catch(() => {});
      }

      initSearch();
    } catch (error) {
      console.error("Erreur de chargement des données :", error);

      const stats = document.getElementById("stats");
      if (stats) {
        stats.textContent =
          "Erreur de chargement des données. Vérifie le chemin ./data/sites.json et le format JSON.";
      }
    }
  }

  // =========================================================
  // 8) RECHERCHE
  // =========================================================

  function initSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    input.addEventListener("input", (event) => {
      const q = normalizeText(event.target.value);

      if (!q) {
        renderList(allSites);
        return;
      }

      const filtered = allSites.filter((site) => {
        return (
          normalizeText(site.site_id).includes(q) ||
          normalizeText(site.localisation).includes(q) ||
          normalizeText(site.etat_global).includes(q) ||
          normalizeText(site.etat_chimique).includes(q)
        );
      });

      renderList(filtered);
    });
  }

  // =========================================================
  // 8.5) POPUP AU SURVOL
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

  // =========================================================
  // 9) ZOOM À LA MOLETTE
  // =========================================================

  let wheelTimeout;

  view.container.addEventListener("wheel", (event) => {
    event.preventDefault();

    const zoomStep = 1;
    const direction = event.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(5, Math.min(18, view.zoom + direction * zoomStep));

    if (newZoom !== view.zoom) {
      view.zoom = newZoom;

      // Afficher l'indicateur de zoom
      const zoomInfo = document.getElementById("zoomInfo");
      zoomInfo.style.opacity = "1";
      zoomInfo.textContent = `🔍 Zoom: ${newZoom}`;

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        zoomInfo.style.opacity = "0";
      }, 1500);
    }
  }, { passive: false });

  // =========================================================
  // 10) INITIALISATION
  // =========================================================

  view.when(() => {
    injectLegendHtml();
    loadSites();
    
    console.log("✅ Application chargée");
    console.log("🗺️  Carte affichée");
    console.log("📍 " + allSites.length + " sites trouvés");
  });
});