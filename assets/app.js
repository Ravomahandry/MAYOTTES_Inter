// Attendre que l'API ArcGIS soit chargée
const viewDiv = document.getElementById("viewDiv");

function setViewStatus(message, type = "info") {
  if (!viewDiv) return;

  let status = document.getElementById("mapStatus");
  if (!status) {
    status = document.createElement("div");
    status.id = "mapStatus";
    status.style.position = "absolute";
    status.style.inset = "16px auto auto 16px";
    status.style.zIndex = "20";
    status.style.maxWidth = "360px";
    status.style.padding = "0.85rem 1rem";
    status.style.borderRadius = "0.75rem";
    status.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.18)";
    status.style.backdropFilter = "blur(6px)";
    status.style.fontWeight = "600";
    status.style.pointerEvents = "none";
    status.style.whiteSpace = "pre-line";
    viewDiv.appendChild(status);
  }

  const palette = {
    info: { bg: "rgba(15, 118, 110, 0.92)", fg: "#ffffff" },
    success: { bg: "rgba(22, 163, 74, 0.92)", fg: "#ffffff" },
    error: { bg: "rgba(185, 28, 28, 0.92)", fg: "#ffffff" }
  };

  const colors = palette[type] || palette.info;
  status.style.background = colors.bg;
  status.style.color = colors.fg;
  status.textContent = message;
}

function clearViewStatus() {
  const status = document.getElementById("mapStatus");
  if (status) status.remove();
}

function waitForArcGIS(timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (window.__arcgisLoaded && typeof window.require === "function") {
      resolve(); return;
    }
    const checkInterval = setInterval(() => {
      if (window.__arcgisLoaded && typeof window.require === "function") {
        clearInterval(checkInterval);
        clearTimeout(timeoutHandle);
        resolve();
      }
    }, 100);
    const timeoutHandle = setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error("Le SDK ArcGIS n'a pas pu se charger."));
    }, timeoutMs);
  });
}

setViewStatus("Chargement de la carte et des sites...");

waitForArcGIS()
  .then(() => {
    window.require([
      "esri/Map",
      "esri/views/MapView",
      "esri/layers/GraphicsLayer",
      "esri/Graphic",
      "esri/geometry/Point",
      "esri/core/promiseUtils"
    ], function (Map, MapView, GraphicsLayer, Graphic, Point, promiseUtils) {

      // 1) CONFIGURATION CARTE
      const map = new Map({ basemap: "hybrid" });
      const graphicsLayer = new GraphicsLayer({ title: "Sites de prélèvements" });
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

      // 2) OUTILS
      function escapeHtml(v) {
        if (!v) return "—";
        return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]));
      }

      function normalizeText(v) {
        return (v || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      }

      function dmsToDecimal(dms) {
        if (!dms || typeof dms !== "string") return null;
        const cleaned = dms.trim()
          .replace(/[″”""\s]/g, '"')
          .replace(/[′’''\s]/g, "'")
          .replace(/[\s]/g, "");
        const match = cleaned.match(/^(\d+)°(\d+)'([\d.]+)"([NSEW])$/i);
        if (!match) return null;
        let dec = Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600;
        if (match[4].toUpperCase() === "S" || match[4].toUpperCase() === "W") dec *= -1;
        return Number(dec.toFixed(6));
      }

      function parseEtatScore(v) {
        if (!v) return null;
        const match = String(v).match(/^(\d+)/);
        return match ? Number(match[1]) : null;
      }

      // 3) COULEURS ET SYMBOLES
      function getColorByAttributes(site) {
        const score = parseEtatScore(site.etat_global);
        const chem = normalizeText(site.etat_chimique);
        if (score !== null) {
          if (score >= 8) return "#16a34a";
          if (score >= 6) return "#84cc16";
          if (score >= 4) return "#f59e0b";
          return "#dc2626";
        }
        if (chem.includes("tres degrade")) return "#7f1d1d";
        if (chem.includes("degrade")) return "#dc2626";
        if (chem.includes("impacte")) return "#f59e0b";
        return "#6b7280";
      }

      function createGraphic(site) {
        return new Graphic({
          geometry: new Point({ longitude: site.longitude, latitude: site.latitude }),
          symbol: {
            type: "simple-marker",
            color: getColorByAttributes(site),
            size: 12,
            outline: { color: "#111827", width: 1.5 }
          },
          attributes: site,
          popupTemplate: {
            title: `Site ${site.site_id} — ${site.localisation}`,
            content: buildDetailedPopupContent(site)
          }
        });
      }

      // 4) POPUP DÉTAILLÉE
      function buildDetailedPopupContent(site) {
        const score = parseEtatScore(site.etat_global);
        const color = getColorByAttributes(site);
        const fields = [
          { label: "Flux sédimentaire", value: site.flux_sedimentaire },
          { label: "État chimique", value: site.etat_chimique },
          { label: "Population", value: site.densite_population },
          { label: "Fréquentation", value: site.frequentation_lagon },
          { label: "Patrimoine", value: site.patrimoine_naturel },
          { label: "Turbidité", value: site.turbidite },
          { label: "État récif", value: site.etat_recif }
        ].filter(f => f.value && f.value !== "N/A" && f.value !== "");

        return `
          <div class="detailed-popup">
            <div class="popup-header" style="border-left: 6px solid ${color}; background: ${color}10;">
              <h3>${escapeHtml(site.localisation)}</h3>
              <div style="font-size:0.75rem; color:#64748b; margin-top:4px">Site ID: ${site.site_id} | Relevé: ${site.date_prelevement}</div>
            </div>
            <div class="section">
              <div class="score-display">
                <div class="score-number" style="color: ${color};">${score !== null ? score : 'X'}</div>
                <div style="font-size:1.1rem; color:#64748b; font-weight:600">/ 10</div>
              </div>
              <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px">Indice d'état de santé global</div>
            </div>
            <div class="section">
              <div class="characteristics-grid">
                ${fields.map(f => `
                  <div class="characteristic-item">
                    <div class="char-label">${f.label}</div>
                    <div class="char-value">${escapeHtml(f.value)}</div>
                  </div>
                `).join("")}
              </div>
            </div>
            ${site.algues && site.algues.length ? `
              <div class="section">
                <div class="char-label" style="margin-bottom:8px">Algues identifiées</div>
                <div>${site.algues.map(a => `<span class="algue-badge">${escapeHtml(a)}</span>`).join("")}</div>
              </div>
            ` : ''}
          </div>
        `;
      }

      // 5) RECHERCHE ET MODAL
      const searchModal = document.getElementById("searchModal");
      const searchToggle = document.getElementById("searchToggle");
      const searchClose = document.getElementById("searchClose");
      const siteList = document.getElementById("siteList");
      const searchInput = document.getElementById("searchInput");

      searchToggle.onclick = () => searchModal.classList.add("open");
      searchClose.onclick = () => searchModal.classList.remove("open");
      searchModal.onclick = (e) => { if(e.target === searchModal) searchModal.classList.remove("open"); };

      function renderList(sites) {
        siteList.innerHTML = "";
        sites.forEach(site => {
          const btn = document.createElement("button");
          btn.innerHTML = `<strong>Site ${site.site_id}</strong> — ${site.localisation}<br>
                           <small style="color:#666">${site.etat_global} | ${site.date_prelevement}</small>`;
          btn.onclick = () => {
            view.goTo({ center: [site.longitude, site.latitude], zoom: 14 });
            const g = graphicsLayer.graphics.find(x => x.attributes.site_id === site.site_id);
            if(g) view.popup.open({ location: g.geometry, features: [g] });
            searchModal.classList.remove("open");
          };
          const li = document.createElement("li");
          li.appendChild(btn);
          siteList.appendChild(li);
        });
      }

      // 6) INTERACTION STABLE (SURVOL)
      const hoverPopup = promiseUtils.debounce(async (event) => {
        const hit = await view.hitTest(event);
        const result = hit.results.find(r => r.graphic && r.graphic.layer === graphicsLayer);

        if (result) {
          view.container.style.cursor = "pointer";
          const graphic = result.graphic;
          if (!view.popup.visible || view.popup.selectedFeature !== graphic) {
            view.popup.open({
              location: graphic.geometry,
              features: [graphic],
              updateLocationEnabled: true
            });
          }
        } else {
          view.container.style.cursor = "default";
        }
      });

      view.on("pointer-move", (e) => hoverPopup(e).catch(() => {}));

      // 7) CHARGEMENT ET LÉGENDE
      let allSites = [];
      async function loadData() {
        try {
          const res = await fetch("./data/sites.json");
          const data = await res.json();
          allSites = data.map(s => ({ ...s, latitude: dmsToDecimal(s.latitude_dms), longitude: dmsToDecimal(s.longitude_dms) }))
                         .filter(s => s.latitude && s.longitude);

          allSites.forEach(s => graphicsLayer.add(createGraphic(s)));
          renderList(allSites);
          setViewStatus(`${allSites.length} sites chargés.`, "success");
          setTimeout(clearViewStatus, 3000);
        } catch (e) { setViewStatus("Erreur de données.", "error"); }
      }

      function injectLegend() {
        const sidebar = document.querySelector(".sidebar");
        if (!sidebar) return;
        const sect = document.createElement("section");
        sect.className = "card";
        sect.innerHTML = `
          <h3>Légende État</h3>
          <div class="legend-list">
            <div class="legend-item"><span class="legend-circle" style="background:#16a34a"></span> Très bon (8-10)</div>
            <div class="legend-item"><span class="legend-circle" style="background:#84cc16"></span> Bon à moyen (6-7)</div>
            <div class="legend-item"><span class="legend-circle" style="background:#f59e0b"></span> Impacté (4-5)</div>
            <div class="legend-item"><span class="legend-circle" style="background:#dc2626"></span> Dégradé (0-3)</div>
            <div class="legend-item"><span class="legend-circle" style="background:#7f1d1d"></span> Très dégradé</div>
            <div class="legend-item"><span class="legend-circle" style="background:#6b7280"></span> Non renseigné</div>
          </div>
        `;
        sidebar.appendChild(sect);
      }

      searchInput.oninput = (e) => {
        const q = normalizeText(e.target.value);
        renderList(allSites.filter(s => normalizeText(s.localisation).includes(q) || s.site_id.includes(q)));
      };

      loadData();
      view.when(injectLegend);
    });
  }).catch(e => setViewStatus("Erreur SDK ArcGIS.", "error"));
