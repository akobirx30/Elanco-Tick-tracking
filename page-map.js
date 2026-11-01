
(function () {
  const TW = window.TW;
  const esc = TW.esc;
  TW.pages = TW.pages || {};

  const SIZE = { low: 24, medium: 30, high: 38 };
  const MARKS = { low: "!", medium: "!!", high: "!!!" };
  const iconCache = {};
  function getIcon(s, selected) {
    const recent = TW.isRecent(s);
    const key = [s.species, s.severity, recent, selected].join("|");
    if (!iconCache[key]) {
      const size = SIZE[s.severity];
      iconCache[key] = L.divIcon({
        className: "tick-icon",
        html: `<span class="tick-marker sev-${s.severity}${recent ? " recent" : ""}${selected ? " selected" : ""}" style="--c:${TW.getSpecies(s.species).colour}"><span aria-hidden="true">${MARKS[s.severity]}</span></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    }
    return iconCache[key];
  }

  function legendSpecies() {
    return TW.SPECIES.map((s) => `<li><span class="swatch" style="background:${s.colour}" aria-hidden="true"></span> ${esc(s.commonName)}</li>`).join("");
  }

  TW.pages.map = function (root, params) {
    const mobile = !window.matchMedia("(min-width: 800px)").matches;
    root.innerHTML = `
      <div class="map-page">
        <div class="map-toolbar">
          <h1 class="sr-only">Tick sightings map</h1>
          <button type="button" class="btn" id="toggle-filters" aria-expanded="${!mobile}" aria-controls="filters-region">${mobile ? "Show filters" : "Hide filters"}</button>
          <div id="filters-region" ${mobile ? "hidden" : ""}>
            <form class="filters" id="filters" aria-label="Filter sightings">
              <div class="field"><label for="f-from">From</label><input id="f-from" type="date"></div>
              <div class="field"><label for="f-to">To</label><input id="f-to" type="date"></div>
              <div class="field"><label for="f-species">Species</label><select id="f-species">${TW.speciesOptions("All species")}</select></div>
              <div class="field"><label for="f-sev">Severity</label>
                <select id="f-sev"><option value="all">All levels</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              <div class="field"><label for="f-city">Area</label><select id="f-city">${TW.cityOptions("Whole UK")}</select></div>
              <div class="filters-actions">
                <button type="button" class="btn btn-ghost" id="f-reset">Reset filters</button>
                <p role="status" class="result-count" id="count"></p>
              </div>
            </form>
          </div>
        </div>
        <div class="map-wrap">
          <div id="map" class="map"></div>
          <div id="map-status" class="map-overlay" role="status">Loading sightings…</div>
          <details class="legend"><summary>Map key</summary><div class="legend-body">
            <p class="legend-title">Colour = species</p>
            <ul id="legend-species">${legendSpecies()}</ul>
            <p class="legend-title">Size and marks = severity</p>
            <ul>
              <li><span class="mini-marker" style="width:18px;height:18px">!</span> Low</li>
              <li><span class="mini-marker" style="width:22px;height:22px">!!</span> Medium</li>
              <li><span class="mini-marker" style="width:28px;height:28px">!!!</span> High</li>
            </ul>
            <p class="legend-title">Pulsing ring = last 14 days</p>
          </div></details>
          <div id="panel-host"></div>
        </div>
      </div>`;

    const $ = (id) => root.querySelector("#" + id);
    const statusEl = $("map-status");
    const panelHost = $("panel-host");

    if (TW.leafletMissing()) {
      statusEl.className = "map-overlay error"; statusEl.setAttribute("role", "alert");
      statusEl.textContent = TW.NO_LEAFLET_MSG;
      return function () {};
    }

    let all = [];
    let selectedId = null;
    let filters = {};
    const markers = {};

    const map = L.map("map", { minZoom: 5, maxBounds: [[48, -12], [62, 4]] }).setView(TW.UK_CENTER, 6);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);

    function readFilters() {
      filters = { from: $("f-from").value, to: $("f-to").value, species: $("f-species").value, severity: $("f-sev").value, city: $("f-city").value };
      $("f-from").max = filters.to || ""; $("f-to").min = filters.from || "";
    }
    root.querySelectorAll("#filters input, #filters select").forEach((el) => el.addEventListener("input", () => { readFilters(); refresh(); }));
    $("f-reset").addEventListener("click", () => { $("filters").reset(); readFilters(); refresh(); });
    $("filters").addEventListener("submit", (e) => e.preventDefault());
    $("toggle-filters").addEventListener("click", (e) => {
      const region = $("filters-region");
      region.hidden = !region.hidden;
      e.currentTarget.setAttribute("aria-expanded", String(!region.hidden));
      e.currentTarget.textContent = region.hidden ? "Show filters" : "Hide filters";
    });

    function refresh() {
      const list = TW.applyFilters(all, filters);
      layer.clearLayers();
      Object.keys(markers).forEach((k) => delete markers[k]);
      list.forEach((s) => {
        const label = `${TW.getSpecies(s.species).commonName}, ${s.severityKnown === false ? "severity not reported" : TW.SEVERITY_LABEL[s.severity] + " severity"}, ${TW.formatDate(s.observedAt)}, ${s.locationLabel}`;
        const m = L.marker([s.lat, s.lng], {
          icon: getIcon(s, s.id === selectedId), title: label, alt: label, keyboard: true,
          zIndexOffset: s.id === selectedId ? 1000 : 0,
        });
        m.on("click", () => select(s.id, true));
        m.addTo(layer);
        markers[s.id] = m;
      });
      $("count").innerHTML = `Showing <strong>${list.length}</strong> of ${all.length} sightings`;
    }

    function restyle(id, sel) {
      const s = all.find((x) => x.id === id);
      if (s && markers[id]) { markers[id].setIcon(getIcon(s, sel)); markers[id].setZIndexOffset(sel ? 1000 : 0); }
    }

    function select(id, fly) {
      const s = all.find((x) => x.id === id);
      if (!s) return;
      if (selectedId && selectedId !== id) restyle(selectedId, false);
      selectedId = id;
      restyle(id, true);
      if (fly) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 9), { animate: !reduce, duration: 0.8 });
      }
      history.replaceState(null, "", "#/?sighting=" + encodeURIComponent(id));
      renderPanel(s);
    }

    function closePanel() {
      if (selectedId) restyle(selectedId, false);
      selectedId = null;
      panelHost.innerHTML = "";
      history.replaceState(null, "", "#/");
    }

    function renderPanel(s) {
      const sp = TW.getSpecies(s.species);
      const RADIUS = 25;
      const nearby = all.filter((o) => TW.distanceKm(s.lat, s.lng, o.lat, o.lng) <= RADIUS)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
      const now = new Date();
      const monthly = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return { y: d.getFullYear(), m: d.getMonth(), c: 0 };
      });
      nearby.forEach((o) => {
        const d = new Date(o.observedAt);
        const b = monthly.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
        if (b) b.c++;
      });
      const max = Math.max(1, ...monthly.map((x) => x.c));
      const directions = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
      const reportUrl = `#/report?lat=${s.lat}&lng=${s.lng}&city=${encodeURIComponent(s.city)}`;

      panelHost.innerHTML = `
        <aside class="sighting-panel" aria-label="Sighting details">
          <div class="panel-head">
            <h2 id="panel-h" tabindex="-1">${esc(sp.commonName)}</h2>
            <button type="button" class="icon-btn" id="panel-close" aria-label="Close details">✕</button>
          </div>
          <p class="latin">${esc(sp.latinName)}</p>
          <ul class="badges" aria-label="Summary">
            <li class="badge ${s.severityKnown === false ? "" : "sev-" + s.severity}">Severity: ${s.severityKnown === false ? "Not reported" : TW.SEVERITY_LABEL[s.severity]}</li>
            <li class="badge"><span class="swatch" style="background:${sp.colour}" aria-hidden="true"></span> ${esc(sp.commonName)}</li>
            ${TW.isRecent(s) ? '<li class="badge badge-recent">Recent activity</li>' : ""}
          </ul>
          <p class="muted small">${s.severityKnown === false ? "The data source does not provide a severity level." : TW.SEVERITY_DESC[s.severity]}</p>
          ${s.imageDataUrl ? `<img class="sighting-img" src="${s.imageDataUrl}" alt="Photo submitted with the report: ${esc(sp.commonName)}">` : ""}
          <dl class="details">
            <dt>Observed</dt><dd>${TW.formatDateTime(s.observedAt)}</dd>
            <dt>Location</dt><dd>${esc(s.locationLabel)}</dd>
            <dt>Habitat</dt><dd>${esc(s.habitat)}</dd>
            <dt>Found on</dt><dd>${esc(s.host)}</dd>
            <dt>Reported by</dt><dd>${esc(s.reporter)}</dd>
            ${s.notes ? `<dt>Notes</dt><dd>${esc(s.notes)}</dd>` : ""}
          </dl>
          <div class="actions" role="group" aria-label="Quick actions">
            <a class="btn btn-primary" href="${reportUrl}">Report a sighting here</a>
            <a class="btn" href="${directions}" target="_blank" rel="noopener noreferrer">Get directions<span class="sr-only"> (opens in a new tab)</span></a>
            <button type="button" class="btn" id="share-btn">Share</button>
          </div>
          <p role="status" class="small muted" id="share-msg"></p>
          <section aria-labelledby="tl-h">
            <h3 id="tl-h">Activity within ${RADIUS} km</h3>
            <p class="small muted">${nearby.length} sightings recorded in this area. Last 12 months:</p>
            <div class="spark" role="img" aria-label="Sightings per month, last 12 months: ${monthly.map((x) => TW.MONTHS[x.m] + " " + x.c).join(", ")}">
              ${monthly.map((x) => `<div class="spark-col" title="${TW.MONTHS[x.m]} ${x.y}: ${x.c}"><div class="spark-bar" style="height:${(x.c / max) * 100}%"></div><span class="spark-label" aria-hidden="true">${TW.MONTHS[x.m][0]}</span></div>`).join("")}
            </div>
            <ol class="timeline">
              ${nearby.slice(0, 8).map((o) => `
                <li class="${o.id === s.id ? "current" : ""}" ${o.id === s.id ? 'aria-current="true"' : ""}>
                  <span class="tl-dot" style="background:${TW.getSpecies(o.species).colour}" aria-hidden="true"></span>
                  <div><button type="button" class="link-btn" data-id="${esc(o.id)}">${TW.formatDate(o.observedAt)}: ${esc(TW.getSpecies(o.species).commonName)}</button>
                  <div class="small muted">${o.severityKnown === false ? "Severity not reported" : TW.SEVERITY_LABEL[o.severity] + " severity"} · ${esc(o.locationLabel)}</div></div>
                </li>`).join("")}
            </ol>
          </section>
        </aside>`;

      const panel = panelHost.querySelector(".sighting-panel");
      panel.querySelector("#panel-h").focus();
      panel.querySelector("#panel-close").addEventListener("click", closePanel);
      panel.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
      panel.querySelectorAll("[data-id]").forEach((b) => b.addEventListener("click", () => select(b.dataset.id, true)));
      panel.querySelector("#share-btn").addEventListener("click", async () => {
        const msg = panel.querySelector("#share-msg");
        const url = location.origin + location.pathname + "#/?sighting=" + encodeURIComponent(s.id);
        try {
          if (navigator.share) { await navigator.share({ title: "Tick sighting: " + sp.commonName, text: `${sp.commonName} reported near ${s.city} on ${TW.formatDate(s.observedAt)}`, url }); return; }
          await navigator.clipboard.writeText(url);
          msg.textContent = "Link copied to clipboard.";
        } catch (e) {
          if (e && e.name === "AbortError") return;
          msg.textContent = "Could not share automatically. Copy the page address instead.";
        }
      });
    }

    function load(force) {
      statusEl.hidden = false; statusEl.className = "map-overlay"; statusEl.setAttribute("role", "status");
      statusEl.textContent = "Loading sightings…";
      TW.api.fetchAll(force).then((res) => {
        all = res.sightings;
        const cur = $("f-species").value;
        $("f-species").innerHTML = TW.speciesOptions("All species");
        $("f-species").value = cur;
        $("legend-species").innerHTML = legendSpecies();
        readFilters(); refresh();
        if (res.warnings.length) {
          statusEl.className = "map-overlay warn"; statusEl.setAttribute("role", "status");
          statusEl.innerHTML = `${res.warnings.map(esc).join("<br>")} <button type="button" class="btn" id="retry">Try again</button> <button type="button" class="btn btn-ghost" id="dismiss">Dismiss</button>`;
          statusEl.querySelector("#retry").addEventListener("click", () => load(true));
          statusEl.querySelector("#dismiss").addEventListener("click", () => { statusEl.hidden = true; });
        } else if (all.length === 0) {
          statusEl.textContent = "No sightings to show yet.";
        } else statusEl.hidden = true;
        if (params.sighting) select(params.sighting, true);
      });
    }
    readFilters();
    load();
    setTimeout(() => map.invalidateSize(), 0);

    return function cleanup() { map.remove(); };
  };
})();
