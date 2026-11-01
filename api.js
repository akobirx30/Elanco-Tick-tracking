
(function () {
  const TW = window.TW;
  const cfg = window.TW_CONFIG || {};
  const BASE = (cfg.API_BASE_URL || "").replace(/\/$/, "");
  const LS_KEY = "tickwatch.community.v1";
  const CACHE_MS = 60 * 1000; // у Elanco API есть лимит запросов (429) — кешируем на минуту

  /* ---------- виды: сопоставление с нашим справочником + динамическое добавление ---------- */
  const KNOWN_LATIN = {
    "ixodes ricinus": "ixodes_ricinus",
    "ixodes hexagonus": "ixodes_hexagonus",
    "dermacentor reticulatus": "dermacentor_reticulatus",
    "haemaphysalis punctata": "haemaphysalis_punctata",
    "rhipicephalus sanguineus": "rhipicephalus_sanguineus",
  };
  const PALETTE = ["#b5651d", "#00796b", "#6a1b9a", "#c2185b", "#455a64", "#827717", "#0277bd", "#ad1457"];

  function speciesIdFor(common, latin) {
    const key = String(latin || "").toLowerCase().trim().split(/\s+/).slice(0, 2).join(" ");
    if (KNOWN_LATIN[key]) return KNOWN_LATIN[key];
    if (!key) return "unknown";
    const id = "api_" + key.replace(/[^a-z]+/g, "_");
    if (!TW.SPECIES.some((s) => s.id === id)) {
      const dyn = TW.SPECIES.filter((s) => s.id.indexOf("api_") === 0).length;
      TW.SPECIES.splice(TW.SPECIES.length - 1, 0, { // "unknown" всегда последний
        id, commonName: common || latin, latinName: latin || "Unknown",
        risk: "No detailed health information is provided by the data source. Treat any tick bite with care and contact your GP or NHS 111 if you develop symptoms.",
        hosts: "Not provided by the data source.",
        lookFor: `Reported in the data source as “${common || latin}” (${latin || "no Latin name"}).`,
        colour: PALETTE[dyn % PALETTE.length],
      });
    }
    return id;
  }

  /* ---------- [1] ELANCO API ---------- */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* Пример записи API: { id, date: "2025-08-14T17:30:00", location: "London", species: "Southern rodent tick", latinName: "Ixodes acuminatus" }
     В API НЕТ координат и тяжести, поэтому:
       - координаты = центр города + небольшое стабильное смещение (чтобы маркеры не слипались);
       - severity = "low" с пометкой severityKnown:false (в панели показывается "Not reported"). */
  function normalizeElanco(r, skipped) {
    const loc = String(r.location || "").trim();
    const city = TW.CITIES.find((c) => c.name.toLowerCase() === loc.toLowerCase());
    if (!city) { skipped[loc || "(empty)"] = (skipped[loc || "(empty)"] || 0) + 1; return null; }
    const t = new Date(r.date);
    if (isNaN(t.getTime())) return null;
    const id = String(r.id);
    return {
      id: "elanco-" + id,
      lat: +(city.lat + ((hash(id) % 1000) / 1000 - 0.5) * 0.3).toFixed(5),
      lng: +(city.lng + ((hash(id + "x") % 1000) / 1000 - 0.5) * 0.45).toFixed(5),
      locationLabel: city.name + " (approximate position)",
      city: city.name,
      species: speciesIdFor(r.species, r.latinName),
      severity: "low", severityKnown: false,
      observedAt: t.toISOString(),
      notes: "", reporter: "Elanco data", habitat: "Not reported", host: "Not reported",
      source: "seed",
    };
  }

  async function getJson(url, headers) {
    const res = await fetch(url, { headers });
    if (res.status === 429) throw new Error("rate limit");
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  /* Порядок: 1) живой Elanco API  2) сохранённая копия data/tick-sightings.json  3) (в fetchAll) демо-данные */
  async function fetchElanco() {
    const c = cfg.ELANCO_API || {};
    if (!c.ENABLED) return { items: [], warnings: [], source: "off" };
    const headers = { Accept: "application/json" };
    if (c.API_KEY) headers[c.API_KEY_HEADER || "x-api-key"] = c.API_KEY;

    let json = null, source = "live";
    try {
      json = await getJson(c.BASE_URL.replace(/\/$/, "") + c.SIGHTINGS_PATH, headers);
    } catch (e) {
      console.warn("Live Elanco API failed (probably CORS or rate limit):", e);
      try {
        const snap = await getJson("data/tick-sightings.json");
        if (Array.isArray(snap) && snap.length) { json = snap; source = "snapshot"; }
      } catch (e2) { /* нет сохранённой копии */ }
    }
    if (!json) return { items: [], warnings: [], source: "none" };

    const list = Array.isArray(json) ? json : (json.data || json.results || json.items || []);
    const skipped = {};
    const items = list.map((r) => normalizeElanco(r, skipped)).filter(Boolean);
    const warnings = [];
    const n = Object.keys(skipped).reduce((a, k) => a + skipped[k], 0);
    if (n) warnings.push(`${n} records were skipped because their location isn't in the city list (${Object.keys(skipped).join(", ")}).`);
    if (source === "snapshot") warnings.unshift("The live Elanco API can't be reached from this browser, so a saved copy of its data (data/tick-sightings.json) is shown.");
    return { items, warnings, source };
  }

  /* ---------- [2]/[3] ваш бэкенд или localStorage ---------- */
  function readLocal() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (e) { return []; } }

  async function fetchOwn() {
    if (BASE) {
      const res = await fetch(BASE + "/api/sightings");
      if (!res.ok) throw new Error("Could not load reports from your server (status " + res.status + ").");
      return res.json();
    }
    return (cfg.USE_DEMO_DATA ? TW.SEED : []).concat(readLocal());
  }

  async function createSighting(input) {
    cache = null;
    if (BASE) {
      const res = await fetch(BASE + "/api/sightings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!res.ok) throw new Error("Could not save your report (server returned " + res.status + ").");
      return { sighting: await res.json() };
    }
    const s = Object.assign({}, input, { id: "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6), source: "community" });
    const existing = readLocal();
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(existing.concat([s])));
      return { sighting: s };
    } catch (e) {
      delete s.imageDataUrl;
      localStorage.setItem(LS_KEY, JSON.stringify(existing.concat([s])));
      return { sighting: s, notice: "Saved, but the photo was too large for browser storage and was not kept." };
    }
  }

  /* ---------- то, что вызывают страницы ---------- */
  let cache = null;
  /** Возвращает { sightings, warnings }. Сайт всегда что-то показывает: живой API -> копия -> демо. */
  function fetchAll(force) {
    if (!force && cache && Date.now() - cache.t < CACHE_MS) return cache.p;
    const p = Promise.all([
      fetchOwn().catch((e) => { console.warn(e); return []; }),
      fetchElanco().catch((e) => { console.warn(e); return { items: [], warnings: [], source: "none" }; }),
    ]).then(([own, el]) => {
      let demo = [];
      const warnings = el.warnings.slice();
      if (el.items.length === 0 && el.source !== "off" && !cfg.USE_DEMO_DATA) {
        demo = TW.SEED; // ничего не удалось загрузить — показываем демо-данные, чтобы сайт работал
        warnings.unshift("Showing DEMO data: the live Elanco API can't be reached from this browser (usually a CORS restriction). See README to add a saved copy of the real data.");
      }
      return { sightings: own.concat(el.items, demo), warnings };
    });
    cache = { t: Date.now(), p };
    return p;
  }

  TW.api = { fetchAll, createSighting };
})();
