(function () {
  const TW = window.TW;
  const main = document.getElementById("main");
  let cleanup = null;

  function parse() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const q = raw.indexOf("?");
    const path = q === -1 ? raw : raw.slice(0, q);
    const params = {};
    if (q !== -1) new URLSearchParams(raw.slice(q + 1)).forEach((v, k) => { params[k] = v; });
    return { path, params };
  }

  let lastPath = null;
  function route() {
    const { path, params } = parse();
    if (path === lastPath && path === "/" ) return;
    lastPath = path;
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }

    const page = path === "/" ? TW.pages.map : path === "/learn" ? TW.pages.learn : path === "/report" ? TW.pages.report : null;
    document.querySelectorAll("header nav a").forEach((a) => {
      const target = a.getAttribute("href").replace(/^#/, "");
      if (target === path) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (!page) { main.innerHTML = '<div class="page"><h1>Page not found</h1><p>Use the menu above to get back on track.</p></div>'; return; }
    try {
      cleanup = page(main, params);
    } catch (e) {
      console.error(e);
      main.innerHTML = `<div class="page"><p class="msg msg-error" role="alert">Something went wrong: ${TW.esc(e.message)}</p></div>`;
    }
    if (path !== "/") window.scrollTo(0, 0);
  }

  document.getElementById("skip").addEventListener("click", () => main.focus());
  window.addEventListener("hashchange", route);
  route();
})();
