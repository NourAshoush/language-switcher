const DEFAULT_SETTINGS = {
  interfaceLanguage: "auto",
  resultsLanguage: "any",
  region: "auto"
};

const interfaceInput = document.getElementById("interfaceLanguage");
const resultsInput = document.getElementById("resultsLanguage");
const regionInput = document.getElementById("region");
const saveButton = document.getElementById("saveButton");
const defaultsButton = document.getElementById("defaultsButton");
const status = document.getElementById("status");
const themeToggle = document.getElementById("themeToggle");
const themeToggleIcon = document.getElementById("themeToggleIcon");
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
const popupRoot = document.documentElement;

const DEFAULT_THEME = "system";
const THEME_ORDER = ["system", "dark", "light"];
const THEME_ICONS = {
  system: `
    <svg viewBox="0 0 16 16" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2.5" y="3" width="11" height="8" rx="1.5"></rect>
      <path d="M6 13h4"></path>
      <path d="M8 11v2"></path>
    </svg>
  `,
  dark: `
    <svg viewBox="0 0 16 16" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.9 2.4a5.5 5.5 0 1 0 2.7 9.8 6 6 0 1 1-2.7-9.8Z"></path>
    </svg>
  `,
  light: `
    <svg viewBox="0 0 16 16" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="8" cy="8" r="2.6"></circle>
      <path d="M8 1.7v1.6"></path>
      <path d="M8 12.7v1.6"></path>
      <path d="M1.7 8h1.6"></path>
      <path d="M12.7 8h1.6"></path>
      <path d="M3.4 3.4 4.5 4.5"></path>
      <path d="M11.5 11.5 12.6 12.6"></path>
      <path d="M12.6 3.4 11.5 4.5"></path>
      <path d="M4.5 11.5 3.4 12.6"></path>
    </svg>
  `
};

const LANGUAGE_CODES = ["ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "zh"];
const NATIVE_LANGUAGE_NAMES = {
  ar: "العربية",
  de: "Deutsch",
  en: "English",
  es: "Español",
  fr: "français",
  it: "italiano",
  ja: "日本語",
  ko: "한국어",
  pt: "Português",
  zh: "中文"
};
const REGION_CODES = ["au", "ca", "de", "fr", "gb", "jp", "us"];

function getMessage(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || "";
}

function localizeStaticText() {
  for (const element of document.querySelectorAll("[data-i18n]")) {
    const key = element.dataset.i18n;
    const message = getMessage(key);
    if (message) {
      element.textContent = message;
    }
  }

  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    const key = element.dataset.i18nAriaLabel;
    const message = getMessage(key);
    if (message) {
      element.setAttribute("aria-label", message);
    }
  }

  for (const element of document.querySelectorAll("[data-i18n-title]")) {
    const key = element.dataset.i18nTitle;
    const message = getMessage(key);
    if (message) {
      element.setAttribute("title", message);
    }
  }
}

function buildLanguageLabel(languageCode) {
  const localized = getMessage(`language_name_${languageCode}`) || languageCode;
  const nativeName = NATIVE_LANGUAGE_NAMES[languageCode] || localized;

  if (localized.trim().toLowerCase() === nativeName.trim().toLowerCase()) {
    return localized;
  }

  return `${localized} (${nativeName})`;
}

function buildLanguageOptions() {
  return [
    { value: "auto", label: getMessage("option_auto") || "Auto" },
    ...LANGUAGE_CODES.map((code) => ({
      value: code,
      label: buildLanguageLabel(code)
    }))
  ];
}

function buildResultsLanguageOptions() {
  return [
    ...LANGUAGE_CODES.map((code) => ({
      value: code,
      label: buildLanguageLabel(code)
    })),
    { value: "any", label: getMessage("option_any_language") || "Any language" }
  ];
}

function buildRegionOptions() {
  return [
    { value: "auto", label: getMessage("option_auto") || "Auto" },
    ...REGION_CODES.map((code) => ({
      value: code,
      label: getMessage(`region_name_${code}`) || code.toUpperCase()
    }))
  ];
}

function setStatus(message) {
  status.textContent = message;
}

function getResolvedTheme(themePreference) {
  if (themePreference === "system") {
    return themeMedia.matches ? "dark" : "light";
  }

  return themePreference;
}

function renderTheme(themePreference) {
  const resolvedTheme = getResolvedTheme(themePreference);
  document.body.dataset.theme = resolvedTheme;
  themeToggleIcon.innerHTML = THEME_ICONS[themePreference];
  themeToggle.dataset.themePreference = themePreference;
}

function applyTheme(themePreference, animated = false) {
  if (!animated) {
    renderTheme(themePreference);
    return;
  }

  themeToggle.classList.add("is-transitioning");

  window.setTimeout(() => {
    renderTheme(themePreference);
    themeToggle.classList.remove("is-transitioning");
  }, 120);
}

function populateSelect(select, options) {
  select.textContent = "";
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  }
}

function ensureValidValue(select, fallback) {
  const values = Array.from(select.options, (option) => option.value);

  if (!values.includes(select.value)) {
    select.value = fallback;
  }
}

function applySettings(settings) {
  interfaceInput.value = settings.interfaceLanguage;
  resultsInput.value = settings.resultsLanguage;
  regionInput.value = settings.region;

  ensureValidValue(interfaceInput, DEFAULT_SETTINGS.interfaceLanguage);
  ensureValidValue(resultsInput, DEFAULT_SETTINGS.resultsLanguage);
  ensureValidValue(regionInput, DEFAULT_SETTINGS.region);
}

function readSettingsFromForm() {
  return {
    interfaceLanguage: interfaceInput.value,
    resultsLanguage: resultsInput.value,
    region: regionInput.value
  };
}

function reloadActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const [tab] = tabs;
    if (tab && tab.id) {
      chrome.tabs.reload(tab.id);
    }
  });
}

function setFieldActiveState(select, active) {
  const field = select.closest(".field");

  if (!field) {
    return;
  }

  field.classList.toggle("is-active", active);
}

localizeStaticText();
populateSelect(interfaceInput, buildLanguageOptions());
populateSelect(resultsInput, buildResultsLanguageOptions());
populateSelect(regionInput, buildRegionOptions());
popupRoot.lang = chrome.i18n.getUILanguage();

for (const select of [interfaceInput, resultsInput, regionInput]) {
  select.addEventListener("focus", () => {
    setFieldActiveState(select, true);
  });

  select.addEventListener("blur", () => {
    setFieldActiveState(select, false);
  });

  select.addEventListener("change", () => {
    setFieldActiveState(select, false);
    select.blur();
  });
}

chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
  applySettings(settings);
  applyTheme(settings.themePreference || DEFAULT_THEME);
});

themeToggle.addEventListener("click", () => {
  const currentTheme = themeToggle.dataset.themePreference || DEFAULT_THEME;
  const nextIndex = (THEME_ORDER.indexOf(currentTheme) + 1) % THEME_ORDER.length;
  const nextTheme = THEME_ORDER[nextIndex];

  applyTheme(nextTheme, true);
  chrome.storage.sync.set({ themePreference: nextTheme });
  themeToggle.blur();
});

themeMedia.addEventListener("change", () => {
  chrome.storage.sync.get({ themePreference: DEFAULT_THEME }, (settings) => {
    if ((settings.themePreference || DEFAULT_THEME) === "system") {
      applyTheme("system");
    }
  });
});

saveButton.addEventListener("click", () => {
  const settings = readSettingsFromForm();

  chrome.storage.sync.set(settings, () => {
    setStatus(getMessage("status_saved") || "Saved. Reloading the active tab.");
    reloadActiveTab();
  });
  saveButton.blur();
});

defaultsButton.addEventListener("click", () => {
  applySettings(DEFAULT_SETTINGS);
  chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
    setStatus(getMessage("status_reset") || "Default settings restored.");
    reloadActiveTab();
  });
  defaultsButton.blur();
});
