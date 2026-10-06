(() => {
  "use strict";

  const state = {
    shops: [],
    suburbGroups: [],
    categoryGroups: [],
    suburb: "all",
    category: "all",
    query: "",
  };

  const els = {
    grid: document.getElementById("shop-grid"),
    empty: document.getElementById("empty-state"),
    count: document.getElementById("result-count"),
    search: document.getElementById("search"),
    suburbFilters: document.getElementById("suburb-filters"),
    categoryFilters: document.getElementById("category-filters"),
  };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function chipButton(label, value, group) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = label;
    btn.dataset.value = value;
    btn.dataset.group = group;
    btn.setAttribute("aria-pressed", value === "all" ? "true" : "false");
    return btn;
  }

  function buildFilters() {
    els.suburbFilters.replaceChildren(
      chipButton("All", "all", "suburb"),
      ...state.suburbGroups.map((s) => chipButton(s, s, "suburb"))
    );
    els.categoryFilters.replaceChildren(
      chipButton("All", "all", "category"),
      ...state.categoryGroups.map((c) => chipButton(c, c, "category"))
    );

    els.suburbFilters.addEventListener("click", onChipClick);
    els.categoryFilters.addEventListener("click", onChipClick);
  }

  function onChipClick(e) {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const group = btn.dataset.group;
    const value = btn.dataset.value;
    if (group === "suburb") state.suburb = value;
    if (group === "category") state.category = value;

    const row = group === "suburb" ? els.suburbFilters : els.categoryFilters;
    row.querySelectorAll(".chip").forEach((c) => {
      c.setAttribute("aria-pressed", c === btn ? "true" : "false");
    });
    render();
  }

  function matches(shop) {
    if (state.suburb !== "all" && shop.suburb_group !== state.suburb) {
      return false;
    }
    if (state.category !== "all" && shop.category_group !== state.category) {
      return false;
    }
    const q = state.query.trim().toLowerCase();
    if (q && !shop.name.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  }

  function placeholderHtml(shop) {
    return `
      <div
        class="placeholder"
        role="img"
        aria-label="Photo coming for ${escapeHtml(shop.name)} — ${escapeHtml(shop.category_group)} placeholder"
      >
        <span class="placeholder-icon" aria-hidden="true">${escapeHtml(shop.category_icon)}</span>
        <span class="placeholder-note">photo coming</span>
      </div>`;
  }

  function mediaHtml(shop) {
    const uncertainBadge = shop.uncertain
      ? `<span class="badge-uncertain">listing uncertain</span>`
      : "";

    if (shop.has_photo && shop.image_url) {
      return `
        <div class="card-media">
          ${uncertainBadge}
          <img
            src="${escapeHtml(shop.image_url)}"
            alt="Logo or photo for ${escapeHtml(shop.name)}"
            loading="lazy"
            decoding="async"
            data-fallback-icon="${escapeHtml(shop.category_icon)}"
            data-fallback-name="${escapeHtml(shop.name)}"
            data-fallback-group="${escapeHtml(shop.category_group)}"
          />
        </div>`;
    }

    return `
      <div class="card-media">
        ${uncertainBadge}
        ${placeholderHtml(shop)}
      </div>`;
  }

  function bindImageFallbacks(root) {
    root.querySelectorAll("img[data-fallback-icon]").forEach((img) => {
      img.addEventListener("error", () => {
        const wrap = document.createElement("div");
        wrap.className = "placeholder";
        wrap.setAttribute("role", "img");
        wrap.setAttribute(
          "aria-label",
          `Photo coming for ${img.dataset.fallbackName} — ${img.dataset.fallbackGroup} placeholder`
        );
        wrap.innerHTML = `
          <span class="placeholder-icon" aria-hidden="true">${img.dataset.fallbackIcon}</span>
          <span class="placeholder-note">photo coming</span>`;
        img.replaceWith(wrap);
      });
    });
  }

  function cardHtml(shop) {
    const maps = shop.google_maps_link
      ? `<a class="map-link" href="${escapeHtml(shop.google_maps_link)}" target="_blank" rel="noopener noreferrer">Open in Google Maps<span aria-hidden="true"> ↗</span></a>`
      : "";

    return `
      <article class="shop-card${shop.uncertain ? " is-uncertain" : ""}" data-id="${escapeHtml(shop.id)}">
        ${mediaHtml(shop)}
        <div class="card-body">
          <div class="card-meta">
            <span class="pill">${escapeHtml(shop.category)}</span>
            <span class="pill suburb">${escapeHtml(shop.suburb)}</span>
          </div>
          <h2>${escapeHtml(shop.name)}</h2>
          <p class="card-desc">${escapeHtml(shop.description || "Neighbourhood shop in the Moot.")}</p>
          <p class="card-address">${escapeHtml(shop.address || "Address not listed")}</p>
          <div class="card-actions">${maps}</div>
        </div>
      </article>`;
  }

  function render() {
    const filtered = state.shops.filter(matches);
    filtered.sort((a, b) => Number(a.uncertain) - Number(b.uncertain));

    const total = state.shops.length;
    const uncertainShown = filtered.filter((s) => s.uncertain).length;
    els.count.textContent =
      filtered.length === total
        ? `Showing all ${total} shops${uncertainShown ? ` (${uncertainShown} marked uncertain)` : ""}`
        : `Showing ${filtered.length} of ${total} shops`;

    if (!filtered.length) {
      els.grid.replaceChildren();
      els.grid.setAttribute("aria-busy", "false");
      els.empty.hidden = false;
      return;
    }

    els.empty.hidden = true;
    els.grid.innerHTML = filtered.map(cardHtml).join("");
    bindImageFallbacks(els.grid);
    els.grid.setAttribute("aria-busy", "false");
  }

  let searchTimer = null;
  els.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = els.search.value;
      render();
    }, 120);
  });

  async function init() {
    try {
      const res = await fetch("shops.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.shops = data.shops || [];
      state.suburbGroups = data.suburb_groups || [
        "Villieria",
        "Queenswood",
        "Waverley",
      ];
      state.categoryGroups = data.category_groups || [];
      buildFilters();
      render();
    } catch (err) {
      els.grid.innerHTML =
        `<p class="empty-state">Could not load shops.json. Serve this folder over HTTP (for example <code>python3 -m http.server</code> in the directory folder) so the browser can fetch the data.</p>`;
      els.grid.setAttribute("aria-busy", "false");
      console.error(err);
    }
  }

  init();
})();
