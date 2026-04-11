const DEFAULT_SETTINGS = {
  interfaceLanguage: "auto",
  resultsLanguage: "any",
  region: "auto"
};

function isGoogleHostname(hostname) {
  return /(^|\.)google\.[^.]+(\.[^.]+)?$/i.test(hostname);
}

function isGoogleSearchUrl(url) {
  return isGoogleHostname(url.hostname) && url.pathname === "/search";
}

function normalizeSettings(settings) {
  return {
    interfaceLanguage: (settings.interfaceLanguage || DEFAULT_SETTINGS.interfaceLanguage).trim().toLowerCase(),
    resultsLanguage: (settings.resultsLanguage || DEFAULT_SETTINGS.resultsLanguage).trim().toLowerCase(),
    region: (settings.region || DEFAULT_SETTINGS.region).trim().toLowerCase()
  };
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

  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }

  input.value = value;
}

function enforceFormParams(form, settings) {
  if (!looksLikeSearchForm(form)) {
    return;
  }

  for (const [name, value] of Object.entries(buildEnforcedParams(settings))) {
    setHiddenField(form, name, value);
  }
}

function normalizeSearchUrl(urlString, settings) {
  const url = new URL(urlString);

  if (!isGoogleSearchUrl(url) || !url.searchParams.has("q")) {
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

function redirectSearchPageIfNeeded(settings) {
  const normalizedUrl = normalizeSearchUrl(window.location.href, settings);

  if (normalizedUrl && normalizedUrl !== window.location.href) {
    window.location.replace(normalizedUrl);
  }
}

function installFormHooks(settings) {
  document.addEventListener(
    "submit",
    (event) => {
      enforceFormParams(event.target, settings);
    },
    true
  );

  const observer = new MutationObserver(() => {
    for (const form of document.forms) {
      enforceFormParams(form, settings);
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
  installFormHooks(settings);
}

main();
