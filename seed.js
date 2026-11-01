/* Демо-данные (чтобы приложение не было пустым). Когда подключите свой API — можно не использовать. */
(function () {
  const TW = window.TW;
  function mulberry32(seed) {
    let a = seed;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261030);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  function weighted(items) {
    const total = items.reduce((s, x) => s + x[1], 0);
    let r = rand() * total;
    for (const [v, w] of items) { r -= w; if (r <= 0) return v; }
    return items[items.length - 1][0];
  }
  const MONTH_WEIGHT = [0.15, 0.2, 0.5, 1.2, 1.8, 1.7, 1.2, 0.9, 1.3, 1.4, 0.6, 0.2];
  const SPOTS = ["Woodland edge", "Country park", "Riverside path", "Heathland", "Allotments", "Common land", "Nature reserve"];
  const HABITATS = ["Woodland", "Grassland / meadow", "Heath / moorland", "Park / garden", "Coastal"];
  const HOSTS = ["Human", "Dog", "Cat", "Livestock", "Wildlife", "No host (on vegetation)"];
  const NOTES = ["Found on my leg after a walk.", "Picked off the dog after a woodland walk.", "Several ticks on the dog's ears.",
    "Spotted on a trouser leg, removed straight away.", "Attached for a short time, removed with a tick hook.", "Found while clearing bracken.", ""];
  const REPORTERS = ["Walker", "Dog owner", "Ranger", "Gardener", "Community volunteer", "Anonymous"];
  const SPECIES_W = [["ixodes_ricinus", 55], ["ixodes_hexagonus", 12], ["dermacentor_reticulatus", 10],
    ["haemaphysalis_punctata", 5], ["rhipicephalus_sanguineus", 3], ["unknown", 15]];

  function make(i, ci, when) {
    const city = TW.CITIES[ci];
    const species = weighted(SPECIES_W);
    const severity = weighted(species === "ixodes_ricinus"
      ? [["low", 30], ["medium", 40], ["high", 30]] : [["low", 50], ["medium", 35], ["high", 15]]);
    return {
      id: "seed-" + i,
      lat: +(city.lat + (rand() - 0.5) * 0.3).toFixed(5),
      lng: +(city.lng + (rand() - 0.5) * 0.45).toFixed(5),
      locationLabel: pick(SPOTS) + ", near " + city.name,
      city: city.name, species, severity,
      observedAt: when.toISOString(),
      notes: pick(NOTES), reporter: pick(REPORTERS), habitat: pick(HABITATS), host: pick(HOSTS),
      source: "seed",
    };
  }

  const out = [];
  const now = new Date();
  const y = now.getFullYear();
  const base = TW.CITIES.map(() => 0.6 + rand() * 0.9);
  let n = 0;
  [y - 2, y - 1, y].forEach((year) => {
    TW.CITIES.forEach((_, ci) => {
      for (let m = 0; m < 12; m++) {
        const count = Math.round(base[ci] * MONTH_WEIGHT[m] * (0.6 + rand() * 0.8) * 1.2);
        for (let k = 0; k < count; k++) {
          const when = new Date(Date.UTC(year, m, 1 + Math.floor(rand() * 28), 7 + Math.floor(rand() * 13), Math.floor(rand() * 60)));
          if (when > now) continue;
          out.push(make(n++, ci, when));
        }
      }
    });
  });
  // гарантированно несколько "свежих" наблюдений (последние ~10 дней)
  for (let k = 0; k < 12; k++) {
    const ci = Math.floor(rand() * TW.CITIES.length);
    out.push(make(n++, ci, new Date(now.getTime() - (1 + Math.floor(rand() * 10)) * 864e5 - Math.floor(rand() * 8) * 36e5)));
  }
  TW.SEED = out;
})();
