/* Страница обучения: определитель видов, сезонный график, профилактика. */
(function () {
  const TW = window.TW;
  const esc = TW.esc;
  TW.pages = TW.pages || {};

  const TIPS = [
    ["Before you go", [
      "Wear long trousers tucked into socks, and closed shoes. Light-coloured clothes make ticks easier to spot.",
      "Use a repellent suitable for skin or clothing, following the label instructions.",
      "Keep to paths and avoid brushing against long grass, bracken and leaf litter where possible.",
      "Talk to your vet about tick treatment for dogs and cats."]],
    ["While outdoors", [
      "Take breaks on bare ground or a groundsheet instead of sitting directly in long grass.",
      "Check clothes and exposed skin regularly, and brush off anything crawling.",
      "Keep pets close and check them during and after walks."]],
    ["When you get home", [
      "Do a full-body check: behind knees, groin, armpits, waistband, scalp, behind ears and navel. Check children carefully.",
      "Shower soon after, and put outdoor clothes in the dryer on a hot cycle.",
      "Check dogs and cats, especially ears, armpits and between the toes."]],
    ["If you find a tick", [
      "Remove it promptly with a tick-removal tool or fine-tipped tweezers, gripping as close to the skin as possible.",
      "Pull steadily upwards without twisting or squeezing the body. Don't use petroleum jelly, heat or alcohol.",
      "Clean the bite with soap and water or antiseptic, and note the date.",
      "Watch the bite for weeks afterwards. A spreading red rash or flu-like symptoms: contact your GP or NHS 111 and mention the tick bite.",
      "Report the sighting here to help others in your area."]],
  ];

  function tickSvg(c) {
    let legs = "";
    [-1, 1].forEach((d) => [0, 1, 2, 3].forEach((i) => {
      legs += `<line x1="${24 + d * 9}" y1="${20 + i * 6}" x2="${24 + d * 20}" y2="${16 + i * 8}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`;
    }));
    return `<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" focusable="false"><ellipse cx="24" cy="28" rx="11" ry="13" fill="${c}"/><circle cx="24" cy="13" r="5" fill="${c}"/>${legs}</svg>`;
  }

  function chartSvg(counts, niceMax, peak, total, summary) {
    const W = 640, H = 300, L0 = 44, R = 12, T = 16, B = 34;
    const iw = W - L0 - R, ih = H - T - B, bw = iw / 12;
    let g = "";
    [0, 1, 2, 3, 4].map((i) => Math.round((niceMax / 4) * i)).forEach((t) => {
      const y = T + ih - (t / niceMax) * ih;
      g += `<line x1="${L0}" x2="${W - R}" y1="${y}" y2="${y}" class="grid"/><text x="${L0 - 8}" y="${y + 4}" text-anchor="end" class="axis">${t}</text>`;
    });
    counts.forEach((c, i) => {
      const h = (c / niceMax) * ih, x = L0 + i * bw + bw * 0.15;
      g += `<rect x="${x}" y="${T + ih - h}" width="${bw * 0.7}" height="${h}" rx="3" class="${i === peak && total > 0 ? "bar peak" : "bar"}"><title>${TW.MONTHS_LONG[i]}: ${c} sightings</title></rect>`;
      if (c > 0) g += `<text x="${x + bw * 0.35}" y="${T + ih - h - 4}" text-anchor="middle" class="bar-value">${c}</text>`;
      g += `<text x="${x + bw * 0.35}" y="${H - 12}" text-anchor="middle" class="axis">${TW.MONTHS[i]}</text>`;
    });
    g += `<text x="12" y="${T + ih / 2}" transform="rotate(-90 12 ${T + ih / 2})" text-anchor="middle" class="axis">Sightings</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Bar chart of sightings per month. ${esc(summary)}">${g}</svg>`;
  }

  function speciesCards() {
    return TW.SPECIES.map((s) => `
      <li class="card species-card" style="border-top-color:${s.colour}">
        <div class="species-head">${tickSvg(s.colour)}<div><h3>${esc(s.commonName)}</h3><p class="latin">${esc(s.latinName)}</p></div></div>
        <dl><dt>How to recognise it</dt><dd>${esc(s.lookFor)}</dd>
        <dt>Health risk</dt><dd>${esc(s.risk)}</dd>
        <dt>Usual hosts &amp; habitat</dt><dd>${esc(s.hosts)}</dd></dl>
      </li>`).join("");
  }

  TW.pages.learn = function (root) {
    root.innerHTML = `
      <div class="page">
        <h1>Learn about ticks</h1>
        <p class="lead">Know what to look for, when ticks are most active, and how to protect yourself and your pets.</p>

        <section aria-labelledby="species-h">
          <h2 id="species-h">Species identification guide</h2>
          <ul class="species-grid" id="species-grid">
            ${speciesCards()}
          </ul>
        </section>

        <section aria-labelledby="season-h">
          <h2 id="season-h">Seasonal activity</h2>
          <p>Choose a city and year to see how many sightings were reported each month.</p>
          <div id="chart-host"><p role="status">Loading data…</p></div>
        </section>

        <section aria-labelledby="prevent-h">
          <h2 id="prevent-h">Prevention tips</h2>
          <div class="tips-grid">
            ${TIPS.map((g, i) => `<section class="card" aria-labelledby="tips-${i}"><h3 id="tips-${i}">${g[0]}</h3><ul>${g[1].map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>`).join("")}
          </div>
          <p class="muted small">General guidance only, not medical advice. If you are worried about a bite or symptoms, speak to a healthcare professional.</p>
        </section>
      </div>`;

    const host = root.querySelector("#chart-host");
    let dead = false;

    TW.api.fetchAll().then((res) => {
      if (dead) return;
      const all = res.sightings;
      root.querySelector("#species-grid").innerHTML = speciesCards(); // включая виды из API
      const warn = res.warnings.length ? `<p role="alert" class="msg msg-warning">${res.warnings.map(esc).join("<br>")}</p>` : "";
      const years = [...new Set(all.map((s) => new Date(s.observedAt).getFullYear()))].sort((a, b) => b - a);
      host.innerHTML = warn + `
        <div class="chart-card">
          <div class="chart-controls">
            <div class="field"><label for="c-city">City</label><select id="c-city">${TW.cityOptions("Whole UK")}</select></div>
            <div class="field"><label for="c-year">Year</label><select id="c-year">${years.map((y) => `<option value="${y}">${y}</option>`).join("")}</select></div>
          </div>
          <p role="status" class="chart-summary" id="c-summary"></p>
          <div id="c-svg"></div>
          <details class="data-table"><summary>View chart data as a table</summary><div id="c-table"></div></details>
        </div>`;
      const citySel = host.querySelector("#c-city"), yearSel = host.querySelector("#c-year");
      citySel.value = "London";

      function draw() {
        const city = citySel.value, year = Number(yearSel.value);
        const counts = new Array(12).fill(0);
        all.forEach((s) => {
          const d = new Date(s.observedAt);
          if (d.getFullYear() === year && (city === "all" || s.city === city)) counts[d.getMonth()]++;
        });
        const total = counts.reduce((a, b) => a + b, 0), max = Math.max(...counts);
        const niceMax = Math.max(4, Math.ceil(max / 4) * 4), peak = counts.indexOf(max);
        const place = city === "all" ? "the whole UK" : city;
        const summary = total === 0 ? `No sightings recorded for ${place} in ${year}.`
          : `${total} sightings in ${place} in ${year}. Peak month: ${TW.MONTHS_LONG[peak]} (${max}).`;
        host.querySelector("#c-summary").textContent = summary;
        host.querySelector("#c-svg").innerHTML = chartSvg(counts, niceMax, peak, total, summary);
        host.querySelector("#c-table").innerHTML = `<table><caption class="sr-only">Sightings per month in ${esc(place)}, ${year}</caption><thead><tr><th scope="col">Month</th><th scope="col">Sightings</th></tr></thead><tbody>${counts.map((c, i) => `<tr><th scope="row">${TW.MONTHS_LONG[i]}</th><td>${c}</td></tr>`).join("")}</tbody></table>`;
      }
      citySel.addEventListener("change", draw);
      yearSel.addEventListener("change", draw);
      draw();
    }).catch((err) => {
      if (!dead) host.innerHTML = `<p role="alert" class="msg msg-error">${esc(err.message || "Could not load data.")}</p>`;
    });

    return function cleanup() { dead = true; };
  };
})();
