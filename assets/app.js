/**
 * Application : Carte Interactive des Sites de Mayotte
 * Version : 2.0 (Dashboard Moderne)
 */

const viewDiv = document.getElementById("viewDiv");

// Attendre le SDK ArcGIS
function waitForArcGIS() {
  return new Promise(res => {
    const it = setInterval(() => {
      if(window.__arcgisLoaded && window.require){
        clearInterval(it);
        res();
      }
    }, 100);
  });
}

waitForArcGIS().then(() => {
  window.require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/geometry/Point",
    "esri/core/promiseUtils"
  ], (Map, MapView, GraphicsLayer, Graphic, Point, promiseUtils) => {

    // --- INITIALISATION ---
    const map = new Map({ basemap: "hybrid" });
    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [45.15, -12.85],
      zoom: 11,
      ui: { components: ["zoom", "attribution"] }, // Interface épurée
      popup: {
        autoOpenEnabled: false,
        dockEnabled: false,
        collapseEnabled: false,
        highlightEnabled: true
      }
    });

    const layer = new GraphicsLayer();
    map.add(layer);

    // --- LOGIQUE MÉTIER ---

    // Conversion DMS vers Décimal robuste
    function dmsToDec(dms) {
      if(!dms) return null;
      const clean = dms.toString()
        .replace(/[″”""\s]/g, '"')
        .replace(/[′’''\s]/g, "'")
        .replace(/\s/g, "");
      const m = clean.match(/^(\d+)°(\d+)'([\d.]+)"([NSEW])$/i);
      if(!m) return null;
      let d = Number(m[1]) + Number(m[2])/60 + Number(m[3])/3600;
      if(["S","W"].includes(m[4].toUpperCase())) d *= -1;
      return Number(d.toFixed(6));
    }

    const COLORS = {
      tres_bon: "#16a34a",
      bon: "#84cc16",
      moyen: "#f59e0b",
      degrade: "#dc2626",
      fatal: "#7f1d1d",
      inconnu: "#64748b"
    };

    function getSiteColor(site) {
      const s = parseInt(site.etat_global);
      if(s >= 8) return COLORS.tres_bon;
      if(s >= 6) return COLORS.bon;
      if(s >= 4) return COLORS.moyen;
      if(s >= 1) return COLORS.degrade;
      const chem = (site.etat_chimique || "").toLowerCase();
      if(chem.includes("très dégradé") || chem.includes("tres degrade")) return COLORS.fatal;
      if(chem.includes("dégradé") || chem.includes("degrade")) return COLORS.degrade;
      if(chem.includes("impacté") || chem.includes("impacte")) return COLORS.moyen;
      return COLORS.inconnu;
    }

    // --- RENDU POPUP ---
    function buildPopup(site) {
      const color = getSiteColor(site);
      const score = parseInt(site.etat_global) || "X";

      const details = [
        { l: "État Chimique", v: site.etat_chimique },
        { l: "Fréquentation", v: site.frequentation_lagon },
        { l: "Flux Sédimentaire", v: site.flux_sedimentaire },
        { l: "Récif", v: site.etat_recif },
        { l: "Densité Pop.", v: site.densite_population }
      ].filter(r => r.v && r.v !== "N/A" && r.v !== "");

      return `
        <div class="site-card">
          <div class="site-card-header" style="border-left: 10px solid ${color}">
            <h2>${site.localisation}</h2>
            <small>Site N°${site.site_id} — Relevé du ${site.date_prelevement.replace(/_/g, '/')}</small>
          </div>
          <div class="site-card-body">
            <div class="site-score">
              <span class="score-num" style="color:${color}">${score}</span>
              <span class="score-label">/ 10</span>
            </div>
            <div class="grid-info">
              ${details.map(r => `
                <div class="info-box">
                  <div class="info-label">${r.l}</div>
                  <div class="info-val">${r.v}</div>
                </div>
              `).join('')}
              ${site.algues && site.algues.length ? `
                <div class="info-box full">
                  <div class="info-label">Espèces d'algues identifiées</div>
                  <div style="margin-top:8px">${site.algues.map(a => `<span class="algue-badge">${a}</span>`).join('')}</div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>`;
    }

    // --- INTERACTIONS ---
    let currentId = null;

    // Debounce du survol pour la performance
    const onHover = promiseUtils.debounce(async (e) => {
      const hit = await view.hitTest(e);
      const res = hit.results.find(r => r.graphic && r.graphic.layer === layer);

      if(res) {
        view.container.style.cursor = "pointer";
        const g = res.graphic;
        if(currentId !== g.attributes.site_id) {
          currentId = g.attributes.site_id;
          view.popup.open({
            location: g.geometry,
            content: buildPopup(g.attributes)
          });
        }
      } else {
        view.container.style.cursor = "default";
      }
    });

    view.on("pointer-move", onHover);

    // --- CHARGEMENT DES DONNÉES ---
    let sites = [];

    async function loadData() {
      try {
        const r = await fetch("./data/sites.json");
        const data = await r.json();

        sites = data.map(s => ({
          ...s,
          lat: dmsToDec(s.latitude_dms),
          lon: dmsToDec(s.longitude_dms)
        })).filter(s => s.lat && s.lon);

        sites.forEach(s => {
          layer.add(new Graphic({
            geometry: new Point({ longitude: s.lon, latitude: s.lat }),
            symbol: {
              type: "simple-marker",
              color: getSiteColor(s),
              size: 14,
              outline: { color: "white", width: 3 }
            },
            attributes: s
          }));
        });

        document.getElementById("resultsCount").textContent = `${sites.length} sites`;
        initSearch();
        initLegend();
      } catch (err) {
        console.error("Erreur chargement sites:", err);
        document.getElementById("resultsCount").textContent = "Erreur";
      }
    }

    // --- RECHERCHE ---
    function initSearch() {
      const input = document.getElementById("searchInput");
      const drop = document.getElementById("searchResults");

      input.oninput = (e) => {
        const val = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if(!val) {
          drop.classList.remove("active");
          return;
        }

        const filtered = sites.filter(s =>
          s.localisation.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(val) ||
          s.site_id.includes(val) ||
          (s.etat_global || "").includes(val)
        );

        if(filtered.length > 0) {
          drop.innerHTML = filtered.map(s => `
            <div class="result-item" data-id="${s.site_id}">
              <strong>${s.localisation}</strong>
              <span>ID: ${s.site_id} — État: ${s.etat_global || "Non renseigné"}</span>
            </div>
          `).join('');
          drop.classList.add("active");

          // Evenements sur les items
          document.querySelectorAll(".result-item").forEach(el => {
            el.onclick = () => {
              const s = sites.find(x => x.site_id === el.dataset.id);
              view.goTo({ center: [s.lon, s.lat], zoom: 15 });
              const g = layer.graphics.find(x => x.attributes.site_id === s.site_id);
              currentId = s.site_id;
              view.popup.open({
                location: g.geometry,
                content: buildPopup(s)
              });
              drop.classList.remove("active");
              input.value = s.localisation;
            };
          });
        } else {
          drop.innerHTML = '<div class="result-item">Aucun site trouvé</div>';
          drop.classList.add("active");
        }
      };

      // Fermer au clic ailleurs
      document.addEventListener("click", (e) => {
        if(!input.contains(e.target) && !drop.contains(e.target)) {
          drop.classList.remove("active");
        }
      });
    }

    // --- LÉGENDE ---
    function initLegend() {
      const legend = document.getElementById("legendContent");
      const rows = [
        { c: COLORS.tres_bon, t: "Très bon (8-10)" },
        { c: COLORS.bon, t: "Bon à moyen (6-7)" },
        { c: COLORS.moyen, t: "Impacté (4-5)" },
        { c: COLORS.degrade, t: "Dégradé (0-3)" },
        { c: COLORS.fatal, t: "Très dégradé" },
        { c: COLORS.inconnu, t: "Non renseigné" }
      ];

      legend.innerHTML = rows.map(r => `
        <div class="legend-row">
          <div class="dot" style="background:${r.c}"></div>
          <span>${r.t}</span>
        </div>
      `).join('');
    }

    loadData();
  });
});
