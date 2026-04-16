const DEFAULT_SETTINGS = {
  interfaceLanguage: "auto",
  resultsLanguage: "any",
  region: "auto",
  applyToSearch: true,
  applyToMaps: true,
  applyToImages: true,
  applyToNews: true,
  applyToShopping: true,
  applyToFlights: true,
  applyToHotels: true,
  applyToVideos: true,
  applyToBooks: true
};
const STATS_KEY = "usageStats";
const MAX_STATS_DAYS = 90;
const SEARCH_PRODUCT_BY_TBM = {
  isch: "images",
  nws: "news",
  shop: "shopping",
  vid: "videos",
  bks: "books"
};

let hasRecordedUsageForPage = false;

function isGoogleHostname(hostname) {
  return /(^|\.)google\.[^.]+(\.[^.]+)?$/i.test(hostname);
}

function isGoogleSearchUrl(url) {
  return isGoogleHostname(url.hostname) && url.pathname === "/search";
}

function isGoogleNewsUrl(url) {
  return isGoogleHostname(url.hostname) && url.hostname.startsWith("news.google.");
}

function isGoogleImagesUrl(url) {
  return (
    isGoogleHostname(url.hostname) &&
    (url.hostname.startsWith("images.google.") || url.pathname === "/imghp")
  );
}

function isGoogleBooksUrl(url) {
  return isGoogleHostname(url.hostname) && url.hostname.startsWith("books.google.");
}

function isGoogleShoppingUrl(url) {
  return isGoogleHostname(url.hostname) && (url.hostname.startsWith("shopping.google.") || url.pathname.startsWith("/shopping"));
}

function isGoogleMapsUrl(url) {
  return (
    isGoogleHostname(url.hostname) &&
    (url.hostname.startsWith("maps.google.") ||
      url.pathname === "/maps" ||
      url.pathname.startsWith("/maps/"))
  );
}

function isGoogleTravelUrl(url, product) {
  return isGoogleHostname(url.hostname) && url.pathname.startsWith(`/travel/${product}`);
}

function normalizeSettings(settings) {
  return {
    interfaceLanguage: (settings.interfaceLanguage || DEFAULT_SETTINGS.interfaceLanguage).trim().toLowerCase(),
    resultsLanguage: (settings.resultsLanguage || DEFAULT_SETTINGS.resultsLanguage).trim().toLowerCase(),
    region: (settings.region || DEFAULT_SETTINGS.region).trim().toLowerCase(),
    applyToSearch: settings.applyToSearch !== false,
    applyToMaps: settings.applyToMaps !== false,
    applyToImages: settings.applyToImages !== false,
    applyToNews: settings.applyToNews !== false,
    applyToShopping: settings.applyToShopping !== false,
    applyToFlights: settings.applyToFlights !== false,
    applyToHotels: settings.applyToHotels !== false,
    applyToVideos: settings.applyToVideos !== false,
    applyToBooks: settings.applyToBooks !== false
  };
}

function getSearchProduct(url) {
  if (!isGoogleSearchUrl(url)) {
    return null;
  }

  const tbm = (url.searchParams.get("tbm") || "").trim().toLowerCase();
  return SEARCH_PRODUCT_BY_TBM[tbm] || "search";
}

function isProductEnabled(product, settings) {
  switch (product) {
    case "search":
      return settings.applyToSearch;
    case "images":
      return settings.applyToImages;
    case "news":
      return settings.applyToNews;
    case "shopping":
      return settings.applyToShopping;
    case "flights":
      return settings.applyToFlights;
    case "hotels":
      return settings.applyToHotels;
    case "videos":
      return settings.applyToVideos;
    case "books":
      return settings.applyToBooks;
    case "maps":
      return settings.applyToMaps;
    default:
      return false;
  }
}

function buildEnforcedParams(settings) {
  const params = {};

  if (settings.interfaceLanguage && settings.interfaceLanguage !== "auto") {
    params.hl = settings.interfaceLanguage;
  }

  if (settings.resultsLanguage && settings.resultsLanguage !== "any") {
    params.lr = `lang_${settings.resultsLanguage}`;
  }

  if (settings.region && settings.region !== "auto") {
    params.gl = settings.region;
  }

  return params;
}

function looksLikeSearchForm(form) {
  if (!(form instanceof HTMLFormElement)) {
    return false;
  }

  const action = form.getAttribute("action") || "";
  return action === "/search" || action.includes("/search");
}

function setHiddenField(form, name, value) {
  let input = form.querySelector(`input[name="${name}"]`);
  let changed = false;

  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
    changed = true;
  }

  if (input.value !== value) {
    changed = true;
  }
  input.value = value;
  return changed;
}

function enforceFormParams(form, settings) {
  if (!looksLikeSearchForm(form)) {
    return false;
  }

  let changed = false;
  for (const [name, value] of Object.entries(buildEnforcedParams(settings))) {
    changed = setHiddenField(form, name, value) || changed;
  }

  return changed;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUsageStats(stats) {
  const normalized = {
    total: 0,
    daily: {}
  };

  if (stats && typeof stats === "object") {
    normalized.total = Number.isFinite(stats.total) ? stats.total : 0;
    if (stats.daily && typeof stats.daily === "object") {
      for (const [dateKey, count] of Object.entries(stats.daily)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) && Number.isFinite(count) && count > 0) {
          normalized.daily[dateKey] = count;
        }
      }
    }
  }

  const cutoff = Date.now() - MAX_STATS_DAYS * 24 * 60 * 60 * 1000;
  for (const dateKey of Object.keys(normalized.daily)) {
    const timestamp = Date.parse(`${dateKey}T00:00:00Z`);
    if (!Number.isFinite(timestamp) || timestamp < cutoff) {
      delete normalized.daily[dateKey];
    }
  }

  return normalized;
}

function recordUsageStat() {
  if (hasRecordedUsageForPage) {
    return;
  }

  hasRecordedUsageForPage = true;

  chrome.storage.local.get({ [STATS_KEY]: { total: 0, daily: {} } }, (stored) => {
    const stats = normalizeUsageStats(stored[STATS_KEY]);
    const today = getTodayKey();

    stats.total += 1;
    stats.daily[today] = (stats.daily[today] || 0) + 1;

    chrome.storage.local.set({ [STATS_KEY]: stats });
  });
}

function normalizeSearchUrl(urlString, settings) {
  const url = new URL(urlString);
  const product = getSearchProduct(url);

  if (!product || !isProductEnabled(product, settings) || !url.searchParams.has("q")) {
    return null;
  }

  let changed = false;

  for (const [name, value] of Object.entries(buildEnforcedParams(settings))) {
    if (url.searchParams.get(name) !== value) {
      url.searchParams.set(name, value);
      changed = true;
    }
  }

  if (settings.interfaceLanguage === "auto" && url.searchParams.has("hl")) {
    url.searchParams.delete("hl");
    changed = true;
  }

  if (settings.resultsLanguage === "any" && url.searchParams.has("lr")) {
    url.searchParams.delete("lr");
    changed = true;
  }

  if (settings.region === "auto" && url.searchParams.has("gl")) {
    url.searchParams.delete("gl");
    changed = true;
  }

  return changed ? url.toString() : null;
}

function getMapsLanguage(settings) {
  if (settings.interfaceLanguage !== "auto") {
    return settings.interfaceLanguage;
  }

  if (settings.resultsLanguage !== "any") {
    return settings.resultsLanguage;
  }

  return "";
}

function buildSurfaceParams(settings) {
  const params = {};
  const surfaceLanguage = getMapsLanguage(settings);

  if (surfaceLanguage) {
    params.hl = surfaceLanguage;
  }

  if (settings.region !== "auto") {
    params.gl = settings.region;
  }

  return params;
}

function normalizeSurfaceUrl(urlString, settings, matcher, product) {
  const url = new URL(urlString);

  if (!isProductEnabled(product, settings) || !matcher(url)) {
    return null;
  }

  let changed = false;
  const enforcedParams = buildSurfaceParams(settings);

  for (const [name, value] of Object.entries(enforcedParams)) {
    if (url.searchParams.get(name) !== value) {
      url.searchParams.set(name, value);
      changed = true;
    }
  }

  for (const name of ["hl", "gl"]) {
    if (!(name in enforcedParams) && url.searchParams.has(name)) {
      url.searchParams.delete(name);
      changed = true;
    }
  }

  return changed ? url.toString() : null;
}

function normalizeMapsUrl(urlString, settings) {
  return normalizeSurfaceUrl(urlString, settings, isGoogleMapsUrl, "maps");
}

function normalizeNewsUrl(urlString, settings) {
  return normalizeSurfaceUrl(urlString, settings, isGoogleNewsUrl, "news");
}

function normalizeImagesUrl(urlString, settings) {
  return normalizeSurfaceUrl(urlString, settings, isGoogleImagesUrl, "images");
}

function normalizeBooksUrl(urlString, settings) {
  return normalizeSurfaceUrl(urlString, settings, isGoogleBooksUrl, "books");
}

function normalizeShoppingUrl(urlString, settings) {
  return normalizeSurfaceUrl(urlString, settings, isGoogleShoppingUrl, "shopping");
}

function normalizeTravelUrl(urlString, settings, product) {
  return normalizeSurfaceUrl(
    urlString,
    settings,
    (url) => isGoogleTravelUrl(url, product),
    product
  );
}

function redirectSearchPageIfNeeded(settings) {
  const normalizedUrl = normalizeSearchUrl(window.location.href, settings);

  if (normalizedUrl && normalizedUrl !== window.location.href) {
    recordUsageStat();
    window.location.replace(normalizedUrl);
  }
}

function redirectMapsPageIfNeeded(settings) {
  const normalizedUrl = normalizeMapsUrl(window.location.href, settings);

  if (normalizedUrl && normalizedUrl !== window.location.href) {
    recordUsageStat();
    window.location.replace(normalizedUrl);
  }
}

function redirectSurfacePageIfNeeded(settings, normalizer) {
  const normalizedUrl = normalizer(window.location.href, settings);

  if (normalizedUrl && normalizedUrl !== window.location.href) {
    recordUsageStat();
    window.location.replace(normalizedUrl);
  }
}

function installFormHooks(settings) {
  document.addEventListener(
    "submit",
    (event) => {
      const currentProduct = getSearchProduct(new URL(window.location.href));
      if (!currentProduct || !isProductEnabled(currentProduct, settings)) {
        return;
      }
      if (enforceFormParams(event.target, settings)) {
        recordUsageStat();
      }
    },
    true
  );

  const observer = new MutationObserver(() => {
    const currentProduct = getSearchProduct(new URL(window.location.href));
    if (!currentProduct || !isProductEnabled(currentProduct, settings)) {
      return;
    }

    let changed = false;
    for (const form of document.forms) {
      changed = enforceFormParams(form, settings) || changed;
    }

    if (changed) {
      recordUsageStat();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("pagehide", () => observer.disconnect(), {
    once: true
  });
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (storedSettings) => {
      resolve(normalizeSettings(storedSettings));
    });
  });
}

async function main() {
  if (!isGoogleHostname(window.location.hostname)) {
    return;
  }

  const settings = await loadSettings();

  redirectSearchPageIfNeeded(settings);
  redirectMapsPageIfNeeded(settings);
  redirectSurfacePageIfNeeded(settings, normalizeImagesUrl);
  redirectSurfacePageIfNeeded(settings, normalizeNewsUrl);
  redirectSurfacePageIfNeeded(settings, normalizeShoppingUrl);
  redirectSurfacePageIfNeeded(settings, normalizeBooksUrl);
  redirectSurfacePageIfNeeded(settings, (href, currentSettings) =>
    normalizeTravelUrl(href, currentSettings, "flights")
  );
  redirectSurfacePageIfNeeded(settings, (href, currentSettings) =>
    normalizeTravelUrl(href, currentSettings, "hotels")
  );
  installFormHooks(settings);
}

main();
