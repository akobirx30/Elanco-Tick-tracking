/* Страница отправки наблюдения: форма, валидация (ошибки/предупреждения/успех), загрузка фото. */
(function () {
  const TW = window.TW;
  const esc = TW.esc;
  TW.pages = TW.pages || {};

  const HABITATS = ["Woodland", "Grassland / meadow", "Heath / moorland", "Park / garden", "Coastal", "Other"];
  const HOSTS = ["Human", "Dog", "Cat", "Livestock", "Wildlife", "No host (on vegetation)"];
  const MAX_MB = 8;
  const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  function validate(v, hasImage) {
    const errors = {}, warnings = [];
    if (!v.date) errors.date = "Enter the date you found the tick.";
    if (!v.time) errors.time = "Enter the approximate time.";
    if (v.date && v.time && new Date(`${v.date}T${v.time}`).getTime() > Date.now()) errors.date = "The date and time can't be in the future.";
    if (!v.city) errors.city = "Choose the nearest city.";
    if (v.locationLabel.trim().length < 3) errors.locationLabel = "Describe the place (at least 3 characters), e.g. “Hampstead Heath, east side”.";
    const lat = Number(v.lat), lng = Number(v.lng), B = TW.UK_BOX;
    if (v.lat.trim() === "" || v.lng.trim() === "" || isNaN(lat) || isNaN(lng)) errors.lat = "Pick a point on the map, use your location, or type latitude and longitude.";
    else if (lat < B.minLat || lat > B.maxLat || lng < B.minLng || lng > B.maxLng) errors.lat = "These coordinates are outside the United Kingdom.";
    if (!v.species) errors.species = "Choose a species, or “Unidentified tick” if you're not sure.";
    if (!v.severity) errors.severity = "Choose a severity level.";
    if (v.notes.length > 500) errors.notes = `Notes are ${v.notes.length - 500} characters too long (max 500).`;
    if (v.reporter.length > 60) errors.reporter = "Name must be 60 characters or fewer.";

    if (v.date && !errors.date && (Date.now() - new Date(`${v.date}T${v.time || "12:00"}`).getTime()) / 864e5 > 30)
      warnings.push("This sighting is more than 30 days old. It will be recorded, but older reports are less useful for current risk.");
    if (v.species === "unknown") warnings.push("Species is unidentified. Adding a clear photo helps experts confirm it.");
    if (!hasImage) warnings.push("No photo attached. A photo is optional but makes the report more useful.");
    if (!errors.lat && v.city) {
      const c = TW.CITIES.find((x) => x.name === v.city);
      if (c && TW.distanceKm(lat, lng, c.lat, c.lng) > 80) warnings.push(`The pin is more than 80 km from ${c.name}. Check you picked the nearest city.`);
    }
    if (v.severity === "high") warnings.push("If a tick is attached or you feel unwell, remove it safely and contact your GP or NHS 111.");
    return { errors, warnings };
  }

  function fileToDataUrl(file, maxDim = 900, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This file could not be read as an image.")); };
      img.src = url;
    });
  }

  const errP = (k) => `<p class="field-error" data-err="${k}" hidden></p>`;

  TW.pages.report = function (root, params) {
    root.innerHTML = `
      <div class="page narrow">
        <h1>Report a tick sighting</h1>
        <p class="lead">Reports appear on the map and help others in your area. Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required.</p>
        <div id="messages" class="messages" tabindex="-1"></div>

        <form id="report-form" novalidate class="report-form">
          <fieldset><legend>When</legend><div class="row">
            <div class="field"><label for="r-date">Date *</label><input id="r-date" type="date" max="${todayStr()}" value="${todayStr()}" required>${errP("date")}</div>
            <div class="field"><label for="r-time">Time *</label><input id="r-time" type="time" value="${nowTime()}" required>${errP("time")}</div>
          </div></fieldset>

          <fieldset><legend>Where</legend>
            <div class="row">
              <div class="field"><label for="r-city">Nearest city *</label>
                <select id="r-city" required><option value="">Select a city…</option>${TW.cityOptions("")}</select>${errP("city")}</div>
              <div class="field grow"><label for="r-locationLabel">Place description *</label>
                <input id="r-locationLabel" type="text" placeholder="e.g. Hampstead Heath, east side" required>${errP("locationLabel")}</div>
            </div>
            <p id="map-help" class="small muted">Click the map to place a pin, or use the buttons and fields below (keyboard friendly).</p>
            <div class="picker" aria-describedby="map-help"><div id="picker-map" class="picker-map"></div></div>
            <div class="row"><button type="button" class="btn" id="locate">Use my location</button><p role="status" class="small muted" id="geo-msg"></p></div>
            <div class="row">
              <div class="field"><label for="r-lat">Latitude *</label><input id="r-lat" inputmode="decimal"></div>
              <div class="field"><label for="r-lng">Longitude *</label><input id="r-lng" inputmode="decimal"></div>
            </div>
            ${errP("lat")}
          </fieldset>

          <fieldset><legend>The tick</legend>
            <div class="row">
              <div class="field grow"><label for="r-species">Species *</label>
                <select id="r-species" required aria-describedby="species-hint"><option value="">Select a species…</option>${TW.SPECIES.map((s) => `<option value="${s.id}">${esc(s.commonName)} (${esc(s.latinName)})</option>`).join("")}</select>
                <p id="species-hint" class="small muted"></p>${errP("species")}</div>
              <div class="field grow"><label for="r-severity">Severity *</label>
                <select id="r-severity" required aria-describedby="sev-hint"><option value="">Select severity…</option>${["low", "medium", "high"].map((s) => `<option value="${s}">${TW.SEVERITY_LABEL[s]}</option>`).join("")}</select>
                <p id="sev-hint" class="small muted"></p>${errP("severity")}</div>
            </div>
            <div class="row">
              <div class="field grow"><label for="r-habitat">Habitat</label><select id="r-habitat">${HABITATS.map((h) => `<option>${h}</option>`).join("")}</select></div>
              <div class="field grow"><label for="r-host">Found on</label><select id="r-host">${HOSTS.map((h) => `<option>${h}</option>`).join("")}</select></div>
            </div>
          </fieldset>

          <fieldset><legend>Photo (optional)</legend>
            <div class="field"><label for="r-image">Upload a photo (JPG, PNG or WebP, max ${MAX_MB} MB)</label>
              <input id="r-image" type="file" accept="${ACCEPTED.join(",")}"><p class="field-error" id="img-err" role="alert" hidden></p></div>
            <div class="preview" id="preview" hidden><img id="preview-img" alt=""><button type="button" class="btn btn-ghost" id="remove-img">Remove photo</button></div>
          </fieldset>

          <fieldset><legend>More details</legend>
            <div class="field"><label for="r-notes">Notes</label><textarea id="r-notes" rows="3" aria-describedby="notes-count"></textarea><p id="notes-count" class="small muted">0/500</p>${errP("notes")}</div>
            <div class="field"><label for="r-reporter">Your name (optional)</label><input id="r-reporter" type="text" autocomplete="name">${errP("reporter")}</div>
          </fieldset>

          <button type="submit" class="btn btn-primary btn-lg" id="submit">Submit sighting</button>
        </form>
      </div>`;

    const $ = (id) => root.querySelector("#" + id);
    const msgBox = $("messages");
    let image = null;
    let map = null, pin = null;

    /* ---- подсказки ---- */
    function hints() {
      const sp = TW.SPECIES.find((s) => s.id === $("r-species").value);
      $("species-hint").innerHTML = (sp ? esc(sp.lookFor) : "Not sure? Choose “Unidentified tick” and add a photo.") + ' <a href="#/learn">Open the identification guide</a>';
      const sv = $("r-severity").value;
      $("sev-hint").textContent = sv ? TW.SEVERITY_DESC[sv] : "Low: single tick. Medium: attached or several. High: many or engorged.";
    }
    // подгружаем данные, чтобы в списке появились виды из API
    TW.api.fetchAll().then(() => {
      const cur = $("r-species");
      if (!cur) return;
      const v = cur.value;
      cur.innerHTML = '<option value="">Select a species…</option>' + TW.SPECIES.map((s) => `<option value="${s.id}">${esc(s.commonName)} (${esc(s.latinName)})</option>`).join("");
      cur.value = v; hints();
    }).catch(() => {});
    $("r-species").addEventListener("change", hints);
    $("r-severity").addEventListener("change", hints);
    $("r-notes").addEventListener("input", (e) => { $("notes-count").textContent = e.target.value.length + "/500"; });
    hints();

    /* ---- карта-выбор точки ---- */
    function setPoint(lat, lng) {
      $("r-lat").value = Number(lat).toFixed(5);
      $("r-lng").value = Number(lng).toFixed(5);
      syncPin();
    }
    function syncPin() {
      if (!map) return;
      const lat = parseFloat($("r-lat").value), lng = parseFloat($("r-lng").value);
      if (isNaN(lat) || isNaN(lng)) return;
      if (!pin) {
        pin = L.marker([lat, lng], {
          keyboard: false,
          icon: L.divIcon({ className: "tick-icon", html: '<span class="tick-marker sev-medium" style="--c:#2f6b4f"><span aria-hidden="true">+</span></span>', iconSize: [30, 30], iconAnchor: [15, 15] }),
        }).addTo(map);
      } else pin.setLatLng([lat, lng]);
      if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 9));
    }
    if (!TW.leafletMissing()) {
      map = L.map("picker-map", { scrollWheelZoom: false }).setView(TW.UK_CENTER, 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      map.on("click", (e) => setPoint(e.latlng.lat, e.latlng.lng));
    } else {
      $("picker-map").innerHTML = `<p class="msg msg-warning">${TW.NO_LEAFLET_MSG} You can still type the coordinates below.</p>`;
    }
    $("r-lat").addEventListener("input", syncPin);
    $("r-lng").addEventListener("input", syncPin);

    $("r-city").addEventListener("change", (e) => {
      const c = TW.CITIES.find((x) => x.name === e.target.value);
      if (c) { setPoint(c.lat, c.lng); if (map) map.setView([c.lat, c.lng], 10); }
    });

    $("locate").addEventListener("click", () => {
      const out = $("geo-msg");
      if (!navigator.geolocation) { out.textContent = "Your browser doesn't support location."; return; }
      out.textContent = "Finding your location…";
      navigator.geolocation.getCurrentPosition(
        (pos) => { setPoint(pos.coords.latitude, pos.coords.longitude); out.textContent = "Location added. Check the pin is where you found the tick."; },
        () => { out.textContent = "Couldn't get your location. Click the map or type coordinates instead."; },
        { enableHighAccuracy: true, timeout: 10000 });
    });

    /* ---- предзаполнение из ссылки (#/report?lat=..&lng=..&city=..) ---- */
    if (params.city) $("r-city").value = params.city;
    if (params.lat && params.lng) setPoint(params.lat, params.lng);

    /* ---- фото ---- */
    const imgErr = $("img-err");
    $("r-image").addEventListener("change", async (e) => {
      imgErr.hidden = true;
      const file = e.target.files[0];
      if (!file) return;
      const fail = (m) => { imgErr.textContent = "⚠ " + m; imgErr.hidden = false; e.target.value = ""; };
      if (ACCEPTED.indexOf(file.type) === -1) return fail("Unsupported file type. Please upload a JPG, PNG or WebP image.");
      if (file.size > MAX_MB * 1048576) return fail(`That image is larger than ${MAX_MB} MB. Please choose a smaller one.`);
      try {
        image = { dataUrl: await fileToDataUrl(file), name: file.name };
        $("preview-img").src = image.dataUrl; $("preview-img").alt = "Preview of " + file.name;
        $("preview").hidden = false;
      } catch (err) { fail(err.message); }
    });
    function removeImage() { image = null; $("r-image").value = ""; $("preview").hidden = true; $("preview-img").removeAttribute("src"); }
    $("remove-img").addEventListener("click", removeImage);

    /* ---- сообщения ---- */
    function showErrors(errors) {
      root.querySelectorAll("[data-err]").forEach((p) => { p.hidden = true; p.textContent = ""; });
      root.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
      Object.keys(errors).forEach((k) => {
        const p = root.querySelector(`[data-err="${k}"]`);
        if (p) { p.hidden = false; p.textContent = "⚠ " + errors[k]; }
        (k === "lat" ? ["r-lat", "r-lng"] : ["r-" + k]).forEach((id) => { const el = $(id); if (el) el.setAttribute("aria-invalid", "true"); });
      });
    }
    function renderMessages(o) {
      let h = "";
      if (o.success) h += `<div class="msg msg-success" role="status"><strong>✔ ${esc(o.success)}</strong> <a href="#/?sighting=${encodeURIComponent(o.id)}">View it on the map</a></div>`;
      if (o.submitError) h += `<div class="msg msg-error" role="alert">✖ ${esc(o.submitError)}</div>`;
      const keys = Object.keys(o.errors || {});
      if (keys.length) h += `<div class="msg msg-error" role="alert"><strong>✖ Please fix ${keys.length} ${keys.length === 1 ? "problem" : "problems"} before sending:</strong><ul>${keys.map((k) => `<li><button type="button" class="link-btn" data-focus="${k}">${esc(o.errors[k])}</button></li>`).join("")}</ul></div>`;
      if (o.warnings && o.warnings.length) h += `<div class="msg msg-warning" role="status"><strong>⚠ Worth knowing:</strong><ul>${o.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`;
      msgBox.innerHTML = h;
      msgBox.querySelectorAll("[data-focus]").forEach((b) => b.addEventListener("click", () => { const el = $(b.dataset.focus === "lat" ? "r-lat" : "r-" + b.dataset.focus); if (el) el.focus(); }));
      setTimeout(() => msgBox.focus(), 0);
    }

    /* ---- отправка ---- */
    $("report-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = {
        date: $("r-date").value, time: $("r-time").value, city: $("r-city").value, locationLabel: $("r-locationLabel").value,
        lat: $("r-lat").value, lng: $("r-lng").value, species: $("r-species").value, severity: $("r-severity").value,
        habitat: $("r-habitat").value, host: $("r-host").value, notes: $("r-notes").value, reporter: $("r-reporter").value,
      };
      const res = validate(v, !!image);
      showErrors(res.errors);
      if (Object.keys(res.errors).length) { renderMessages({ errors: res.errors, warnings: res.warnings }); return; }

      const input = {
        lat: Number(v.lat), lng: Number(v.lng), locationLabel: v.locationLabel.trim(), city: v.city,
        species: v.species, severity: v.severity, observedAt: new Date(`${v.date}T${v.time}`).toISOString(),
        notes: v.notes.trim(), reporter: v.reporter.trim() || "Anonymous", habitat: v.habitat, host: v.host,
      };
      if (image) input.imageDataUrl = image.dataUrl;

      const btn = $("submit");
      btn.disabled = true; btn.textContent = "Sending…";
      try {
        const out = await TW.api.createSighting(input);
        renderMessages({
          success: "Thank you! Your sighting was saved (reference " + out.sighting.id + ").", id: out.sighting.id,
          warnings: out.notice ? res.warnings.concat([out.notice]) : res.warnings, errors: {},
        });
        $("report-form").reset();
        $("r-date").value = todayStr(); $("r-time").value = nowTime();
        removeImage(); hints();
        $("notes-count").textContent = "0/500";
        if (pin) { map.removeLayer(pin); pin = null; }
      } catch (err) {
        renderMessages({ submitError: err.message || "Something went wrong saving your report.", warnings: res.warnings, errors: {} });
      } finally {
        btn.disabled = false; btn.textContent = "Submit sighting";
      }
    });

    setTimeout(() => { if (map) map.invalidateSize(); syncPin(); }, 0);
    return function cleanup() { if (map) map.remove(); };
  };
})();
