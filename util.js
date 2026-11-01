(function () {
  const TW = window.TW;
  TW.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  TW.SEVERITY_LABEL = { low: "Low", medium: "Medium", high: "High" };
  TW.SEVERITY_DESC = {
    low: "Single tick, not attached",
    medium: "Attached tick or several ticks",
    high: "Many ticks, engorged tick, or bite with symptoms",
  };
  TW.MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  TW.MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  TW.RECENT_DAYS = 14;
  TW.UK_BOX = { minLat: 49.8, maxLat: 60.9, minLng: -8.7, maxLng: 1.8 };

  TW.getSpecies = (id) => TW.SPECIES.find((s) => s.id === id) || TW.SPECIES[TW.SPECIES.length - 1];
  TW.daysAgo = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  TW.isRecent = (s) => TW.daysAgo(s.observedAt) <= TW.RECENT_DAYS;
  TW.formatDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  TW.formatDateTime = (iso) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  TW.applyFilters = function (list, f) {
    const from = f.from ? new Date(f.from + "T00:00:00").getTime() : -Infinity;
    const to = f.to ? new Date(f.to + "T23:59:59").getTime() : Infinity;
    return list.filter((s) => {
      const t = new Date(s.observedAt).getTime();
      if (t < from || t > to) return false;
      if (f.species && f.species !== "all" && s.species !== f.species) return false;
      if (f.severity && f.severity !== "all" && (s.severityKnown === false || s.severity !== f.severity)) return false;
      if (f.city && f.city !== "all" && s.city !== f.city) return false;
      return true;
    });
  };

  TW.distanceKm = function (aLat, aLng, bLat, bLng) {
    const r = (d) => (d * Math.PI) / 180;
    const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };

  TW.leafletMissing = () => !window.L;
  TW.NO_LEAFLET_MSG = "The map library (Leaflet) could not be loaded. Check your internet connection and reload the page.";

  TW.speciesOptions = (allLabel) =>
    (allLabel ? `<option value="all">${allLabel}</option>` : "") +
    TW.SPECIES.map((s) => `<option value="${s.id}">${TW.esc(s.commonName)}</option>`).join("");
  TW.cityOptions = (allLabel) =>
    (allLabel ? `<option value="all">${allLabel}</option>` : "") +
    TW.CITIES.map((c) => `<option value="${TW.esc(c.name)}">${TW.esc(c.name)}</option>`).join("");
})();
