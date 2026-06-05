// Configuration globale
const viewDiv = document.getElementById("viewDiv");

/**
 * Affiche un message d'état sur la carte
 */
function setViewStatus(message, type = "info") {
  if (!viewDiv) return;
  let status = document.getElementById("mapStatus");
  if (!status) {
    status = document.createElement("div");
    status.id = "mapStatus";
    status.style.position = "absolute";
    status.style.top = "20px";
    status.style.left = "20px";
    status.style.zIndex = "50";
    status.style.padding = "10px 20px";
    status.style.borderRadius = "8px";
    status.style.color = "white";
    status.style.fontWeight = "600";
    status.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    status.style.pointerEvents = "none";
    viewDiv.appendChild(status);
  }
  const bg = { info: "#0f766e", success: "#16a34a", error: "#dc2626" };
  status.style.backgroundColor = bg[type] || bg.info;
  status.textContent = message;
}

function clearViewStatus() {
  const status = document.getElementById("mapStatus");
  if (status) status.remove();
}

/**
 * Attend que le SDK ArcGIS soit prêt
 */
function waitForArcGIS() {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.__arcgisLoaded && typeof window.require === "function") {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });
}

setViewStatus("Chargement des données...");

waitForArcGIS().then(() => {
  window.require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/geometry/Point",
    "esri/core/promiseUtils"
  ], function(Map, MapView, GraphicsLayer, Graphic, Point, promiseUtils) {

    // 1. Initialisation Carte
    const map = new Map({ basemap: "hybrid" });
    const graphicsLayer = new GraphicsLayer({ title: "Sites" });
    map.add(graphicsLayer);

    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [45.15, -12.85],
      zoom: 10,
      popup: {
        autoOpenEnabled: false,
        dockEnabled: false,
        defaultPopupTemplateEnabled: false
      }
    });

    // 2. Utilitaires
    function dmsToDecimal(dms) {
      if (!dms) return null;
      const clean = dms.toString()
        .replace(/[″”""\s]/g, '"')
        .replace(/[′’''\s]/g, "'")
        .replace(/\s/g, "");
      const match = clean.match(/^(\d+)°(\d+)'([\d.]+)"([NSEW])$/i);
      if (!match) return null;
      let dec = Number(match[1]) + Number(match[2])/60 + Number(match[3])/3600;
      if (["S","W"].includes(match[4].toUpperCase())) dec *= -1;
      return Number(dec.toFixed(6));
    }

    function getColor(site) {
      const score = parseInt(site.etat_global);
      if (score >= 8) return "#16a34a";
      if (score >= 6) return "#84cc16";
      if (score >= 4) return "#f59e0b";
      if (score >= 0) return "#dc2626";
      if (site.etat_chimique?.toLowerCase().includes("dégradé")) return "#dc2626";
      return "#6b7280";
    }

    // 3. Contenu du Popup
    function createPopupHTML(site) {
      const scoreVal = parseInt(site.etat_global) || "X";
      const color = getColor(site);
      const fields = [
        { l: "État Chimique", v: site.etat_chimique },
        { l: "Flux Sédimentaire", v: site.flux_sedimentaire },
        { l: "Population", v: site.densite_population },
        { l: "Fréquentation", v: site.frequentation_lagon },
        { l: "Récif", v: site.etat_recif }
      ].filter(f => f.v && f.v !== "" && f.v !== "N/A");

      return `
        <div class="detailed-popup">
          <div class="popup-header" style="border-left: 8px solid ${color}">
            <h3>${site.localisation}</h3>
            <small>ID: ${site.site_id} — Relevé du ${site.date_prelevement.replace(/_/g, '/')}</small>
          </div>
          <div class="popup-body">
            <div class="score-section">
              <span class="score-val" style="color:${color}">${scoreVal}</span>
              <span class="score-max">/10</span>
            </div>
            <div class="details-grid">
              ${fields.map(f => `
                <div class="detail-item">
                  <span class="detail-label">${f.l}</span>
                  <span class="detail-value">${f.v}</span>
                </div>
              `).join('')}
              ${site.algues && site.algues.length ? `
                <div class="detail-item">
                  <span class="detail-label">Algues</span>
                  <div style="margin-top:5px">${site.algues.map(a => `<span class="algue-badge">${a}</span>`).join('')}</div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>`;
    }

    // 4. Interaction (Survol Stable)
    let currentHoverId = null;

    const performHitTest = promiseUtils.debounce(async (event) => {
      const hit = await view.hitTest(event);
      const result = hit.results.find(r => r.graphic && r.graphic.layer === graphicsLayer);

      if (result) {
        const graphic = result.graphic;
        const site = graphic.attributes;

        view.container.style.cursor = "pointer";

        // N'ouvrir que si c'est un nouveau site
        if (currentHoverId !== site.site_id) {
          currentHoverId = site.site_id;
          view.popup.open({
            location: graphic.geometry,
            content: createPopupHTML(site)
          });
        }
      } else {
        view.container.style.cursor = "default";
        // NOTE: On ne ferme pas le popup ici pour qu'il reste stable.
        // Il ne changera que si on survole un autre point.
      }
    });

    view.on("pointer-move", (e) => performHitTest(e));

    // 5. Chargement des données
    let allSites = [];
    async function init() {
      try {
        const response = await fetch("./data/sites.json");
        const data = await response.json();

        allSites = data.map(s => ({
          ...s,
          latitude: dmsToDecimal(s.latitude_dms),
          longitude: dmsToDecimal(s.longitude_dms)
        })).filter(s => s.latitude && s.longitude);

        allSites.forEach(site => {
          graphicsLayer.add(new Graphic({
            geometry: new Point({ longitude: site.longitude, latitude: site.latitude }),
            symbol: {
              type: "simple-marker",
              color: getColor(site),
              size: 12,
              outline: { color: "white", width: 2 }
            },
            attributes: site
          }));
        });

        renderList(allSites);
        injectLegend();
        setViewStatus(`${allSites.length} sites chargés`, "success");
        setTimeout(clearViewStatus, 3000);
      } catch (err) {
        setViewStatus("Erreur de chargement des sites", "error");
      }
    }

    // 6. Liste & Recherche
    function renderList(sites) {
      const list = document.getElementById("siteList");
      if (!list) return;
      list.innerHTML = "";
      sites.forEach(s => {
        const btn = document.createElement("button");
        btn.innerHTML = `<strong>${s.localisation}</strong><br><small>ID: ${s.site_id} | État: ${s.etat_global}</small>`;
        btn.onclick = () => {
          view.goTo({ center: [s.longitude, s.latitude], zoom: 15 });
          const g = graphicsLayer.graphics.find(x => x.attributes.site_id === s.site_id);
          if (g) {
            currentHoverId = s.site_id;
            view.popup.open({ location: g.geometry, content: createPopupHTML(s) });
          }
          document.getElementById("searchModal").classList.remove("open");
        };
        const li = document.createElement("li");
        li.appendChild(btn);
        list.appendChild(li);
      });
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.oninput = (e) => {
        const val = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const filtered = allSites.filter(s =>
          s.localisation.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(val) ||
          s.site_id.includes(val)
        );
        renderList(filtered);
      };
    }

    function injectLegend() {
      const sidebar = document.querySelector(".sidebar");
      if (!sidebar) return;
      const sect = document.createElement("section");
      sect.className = "card";
      sect.innerHTML = `
        <h3>Légende de santé</h3>
        <div class="legend-list">
          <div class="legend-item"><span class="legend-circle" style="background:#16a34a"></span> Très bon (8-10)</div>
          <div class="legend-item"><span class="legend-circle" style="background:#84cc16"></span> Bon à moyen (6-7)</div>
          <div class="legend-item"><span class="legend-circle" style="background:#f59e0b"></span> Impacté (4-5)</div>
          <div class="legend-item"><span class="legend-circle" style="background:#dc2626"></span> Dégradé (0-3)</div>
          <div class="legend-item"><span class="legend-circle" style="background:#6b7280"></span> Non renseigné</div>
        </div>
      `;
      sidebar.appendChild(sect);
    }

    // Gestion de la modal
    const modal = document.getElementById("searchModal");
    document.getElementById("searchToggle").onclick = () => modal.classList.add("open");
    document.getElementById("searchClose").onclick = () => modal.classList.remove("open");
    modal.onclick = (e) => { if(e.target === modal) modal.classList.remove("open"); };

    init();
  });
}).catch(err => setViewStatus("Erreur fatale SDK ArcGIS", "error"));
