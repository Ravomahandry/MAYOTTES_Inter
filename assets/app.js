/**
 * Application : Carte de Monitoring Environnemental (Style Rapport)
 */

const viewDiv = document.getElementById("viewDiv");

function waitForArcGIS() {
  return new Promise(res => {
    const it = setInterval(() => { if(window.__arcgisLoaded && window.require){ clearInterval(it); res(); }}, 100);
  });
}

waitForArcGIS().then(() => {
  window.require([
    "esri/Map", "esri/views/MapView", "esri/layers/GraphicsLayer", "esri/Graphic", "esri/geometry/Point", "esri/core/promiseUtils"
  ], (Map, MapView, GraphicsLayer, Graphic, Point, promiseUtils) => {

    const map = new Map({ basemap: "hybrid" });
    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [45.15, -12.85],
      zoom: 11,
      ui: { components: ["zoom"] },
      popup: { autoOpenEnabled: false, dockEnabled: false, collapseEnabled: false }
    });

    const layer = new GraphicsLayer();
    map.add(layer);

    // --- UTILITAIRES DE DONNÉES ---

    function dmsToDec(dms) {
      if(!dms) return null;
      const clean = dms.toString().replace(/[″”""\s]/g, '"').replace(/[′’''\s]/g, "'").replace(/\s/g, "");
      const m = clean.match(/^(\d+)°(\d+)'([\d.]+)"([NSEW])$/i);
      if(!m) return null;
      let d = Number(m[1]) + Number(m[2])/60 + Number(m[3])/3600;
      if(["S","W"].includes(m[4].toUpperCase())) d *= -1;
      return Number(d.toFixed(6));
    }

    const COLORS = {
      tres_bon: "#16a34a", bon: "#84cc16", moyen: "#f59e0b", degrade: "#dc2626", fatal: "#7f1d1d", neutre: "#64748b"
    };

    function getSiteColor(site) {
      const s = parseInt(site.etat_global);
      if(s >= 8) return COLORS.tres_bon;
      if(s >= 6) return COLORS.bon;
      if(s >= 4) return COLORS.moyen;
      if(s >= 1) return COLORS.degrade;
      return COLORS.neutre;
    }

    function parseScore(str) {
      const m = (str || "").match(/(\d+)\/(\d+)/);
      return m ? { v: parseInt(m[1]), m: parseInt(m[2]) } : { v: 0, m: 6 };
    }

    // --- CONSTRUCTION DU POPUP STYLE RAPPORT ---

    function buildPopup(site) {
      const globalScore = parseInt(site.etat_global) || 0;
      const color = getSiteColor(site);

      const flux = parseScore(site.flux_sedimentaire);
      const pop = parseScore(site.densite_population);
      const turb = parseScore(site.turbidite);

      // Helper pour les badges colorés
      const getBadge = (text) => {
        if(!text) return "";
        let bg = "#f1f5f9", co = "#475569";
        const t = text.toLowerCase();
        if(t.includes("bon")) { bg = "#dcfce7"; co = "#166534"; }
        else if(t.includes("moyen") || t.includes("impacté")) { bg = "#fef3c7"; co = "#92400e"; }
        else if(t.includes("dégradé")) { bg = "#fee2e2"; co = "#991b1b"; }
        return `<span class="char-badge" style="background:${bg}; color:${co}">${text}</span>`;
      };

      return `
      <div class="report-popup">
        <header class="report-header" style="background: linear-gradient(135deg, ${color}, #064e3b)">
          <h2>Site N°${site.site_id} — ${site.localisation}</h2>
          <div class="header-sub">RÉCIF FRANGEANT - MAYOTTE</div>
          <div class="state-pill">État : ${globalScore}/10</div>
        </header>

        <section class="report-section">
          <div class="section-title">ÉTAT GLOBAL DU MILIEU <span>${globalScore} / 10</span></div>
          <div class="global-score-bar">
            ${Array.from({length: 10}).map((_, i) => `
              <div class="score-segment" style="background: ${i < globalScore ? color : '#e2e8f0'}"></div>
            `).join('')}
          </div>
        </section>

        <section class="report-section">
          <div class="section-title">CARACTÉRISTIQUES DU MILIEU</div>

          <div class="char-row">
            <div class="char-num">1</div>
            <div class="char-content">
              <div class="char-label">🌊 Flux sédimentaire (BV)</div>
              <div class="char-val-container">
                <span class="char-val">${site.flux_sedimentaire.split('(')[0]}</span>
                ${getBadge(flux.v + "/" + flux.m)}
              </div>
            </div>
          </div>

          <div class="char-row">
            <div class="char-num">2</div>
            <div class="char-content">
              <div class="char-label">⚗️ État chimique masses d'eau</div>
              <div class="char-val-container">
                <span class="char-val">${site.etat_chimique || "Non renseigné"}</span>
                ${getBadge(site.etat_chimique)}
              </div>
            </div>
          </div>

          <div class="char-row">
            <div class="char-num">3</div>
            <div class="char-content">
              <div class="char-label">👥 Densité de population</div>
              <div class="char-val-container">
                <span class="char-val">${site.densite_population.split('(')[0]}</span>
                ${getBadge(pop.v + "/" + pop.m)}
              </div>
            </div>
          </div>

          <div class="char-row">
            <div class="char-num">4</div>
            <div class="char-content">
              <div class="char-label">🚣 Fréquentation du lagon</div>
              <div class="char-val-container">
                <span class="char-val">${site.frequentation_lagon || "N/A"}</span>
                ${getBadge("Modéré")}
              </div>
            </div>
          </div>

          <div class="char-row">
            <div class="char-num">7</div>
            <div class="char-content">
              <div class="char-label">👁️ Turbidité (visibilité)</div>
              <div class="char-val-container">
                <span class="char-val">${site.turbidite.split('=')[1] || "N/A"}</span>
                ${getBadge(turb.v + "/" + turb.m)}
              </div>
            </div>
          </div>

          <div class="char-row">
            <div class="char-num">8</div>
            <div class="char-content">
              <div class="char-label">🪸 État de santé récif frangeant</div>
              <div class="char-val-container">
                <span class="char-val">${site.etat_recif || "N/A"}</span>
                ${getBadge("Moyen")}
              </div>
            </div>
          </div>
        </section>

        <section class="report-section">
          <div class="section-title">SCORES PAR INDICATEUR (SUR 6)</div>
          ${renderInd("Flux séd.", flux.v, 6, color)}
          ${renderInd("Chimie eau", (site.etat_chimique ? 2 : 0), 6, "#dc2626")}
          ${renderInd("Densité pop.", pop.v, pop.m, "#dc2626")}
          ${renderInd("Fréquentation", 3, 6, "#f59e0b")}
          ${renderInd("Turbidité", turb.v, turb.m, "#dc2626")}
        </section>

        <section class="report-section" style="border:none">
          <div class="section-title">ESPÈCES SUPPOSÉES D'ALGUES</div>
          <div class="algae-tags">
            ${site.algues && site.algues.length ? site.algues.map(a => `<span class="algae-tag">${a}</span>`).join('') : "Aucune donnée"}
          </div>
        </section>
      </div>`;
    }

    function renderInd(label, val, max, col) {
      const pct = Math.min(100, (val / max) * 100);
      return `
        <div class="indicator-row">
          <div class="ind-label">${label}</div>
          <div class="ind-track"><div class="ind-fill" style="width:${pct}%; background:${col}"></div></div>
          <div class="ind-score">${val}/${max}</div>
        </div>`;
    }

    // --- LOGIQUE D'INTERACTION ---

    let currentId = null;
    const onHover = promiseUtils.debounce(async (e) => {
      const hit = await view.hitTest(e);
      const res = hit.results.find(r => r.graphic && r.graphic.layer === layer);
      if(res) {
        view.container.style.cursor = "pointer";
        const g = res.graphic;
        if(currentId !== g.attributes.site_id) {
          currentId = g.attributes.site_id;
          view.popup.open({ location: g.geometry, content: buildPopup(g.attributes) });
        }
      } else { view.container.style.cursor = "default"; }
    });

    view.on("pointer-move", onHover);

    // --- CHARGEMENT ---
    let sites = [];
    fetch("./data/sites.json").then(r => r.json()).then(data => {
      sites = data.map(s => ({ ...s, lat: dmsToDec(s.latitude_dms), lon: dmsToDec(s.longitude_dms) }))
                  .filter(s => s.lat && s.lon);
      sites.forEach(s => {
        layer.add(new Graphic({
          geometry: new Point({ longitude: s.lon, latitude: s.lat }),
          symbol: { type: "simple-marker", color: getSiteColor(s), size: 14, outline: { color: "white", width: 2.5 }},
          attributes: s
        }));
      });
      document.getElementById("resultsCount").textContent = `${sites.length} sites`;
      initSearch();
      initLegend();
    });

    function initSearch() {
      const input = document.getElementById("searchInput");
      const drop = document.getElementById("searchResults");
      input.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        if(!val) { drop.classList.remove("active"); return; }
        const filt = sites.filter(s => s.localisation.toLowerCase().includes(val) || s.site_id.includes(val));
        drop.innerHTML = filt.map(s => `<div class="result-item" data-id="${s.site_id}"><strong>${s.localisation}</strong><span>ID: ${s.site_id}</span></div>`).join('');
        drop.classList.add("active");
        document.querySelectorAll(".result-item").forEach(el => {
          el.onclick = () => {
            const s = sites.find(x => x.site_id === el.dataset.id);
            view.goTo({ center: [s.lon, s.lat], zoom: 15 });
            const g = layer.graphics.find(x => x.attributes.site_id === s.site_id);
            view.popup.open({ location: g.geometry, content: buildPopup(s) });
            drop.classList.remove("active");
            input.value = s.localisation;
          };
        });
      };
    }

    function initLegend() {
      const legend = document.getElementById("legendContent");
      const rows = [
        { c: COLORS.tres_bon, t: "Très bon (8-10)" }, { c: COLORS.bon, t: "Bon (6-7)" },
        { c: COLORS.moyen, t: "Impacté (4-5)" }, { c: COLORS.degrade, t: "Dégradé (0-3)" }, { c: COLORS.neutre, t: "Non renseigné" }
      ];
      legend.innerHTML = rows.map(r => `<div class="legend-row"><div class="dot" style="background:${r.c}"></div>${r.t}</div>`).join('');
    }
  });
});
