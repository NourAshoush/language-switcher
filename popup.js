const {
  DEFAULT_SETTINGS,
  DEFAULT_THEME,
  THEME_ORDER,
  getMessage,
  localizeStaticText,
  buildInterfaceLanguageOptions,
  buildResultsLanguageOptions,
  buildRegionOptions,
  populateSelect,
  ensureValidValue,
  applyTheme,
  buildLanguageLabel,
  LANGUAGE_CODES
} = window.LanguageSwitcherShared;

const PRESETS_KEY = "presets";
const DEFAULT_UI_STATE = {
  advancedOpen: false
};
const CUSTOM_BASIC_VALUE = "__custom__";
const LIVE_SETTING_DEFAULTS = {
  interfaceLanguage: DEFAULT_SETTINGS.interfaceLanguage,
  resultsLanguage: DEFAULT_SETTINGS.resultsLanguage,
  region: DEFAULT_SETTINGS.region
};

const basicLanguageInput = document.getElementById("basicLanguage");
const interfaceInput = document.getElementById("interfaceLanguage");
const resultsInput = document.getElementById("resultsLanguage");
const regionInput = document.getElementById("region");
const saveButton = document.getElementById("saveButton");
const defaultsButton = document.getElementById("defaultsButton");
const status = document.getElementById("status");
const themeToggle = document.getElementById("themeToggle");
const themeToggleIcon = document.getElementById("themeToggleIcon");
const advancedToggle = document.getElementById("advancedToggle");
const advancedToggleLabel = document.getElementById("advancedToggleLabel");
const advancedSection = document.getElementById("advancedSection");
const managePresetsButton = document.getElementById("managePresetsButton");
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
const popupRoot = document.documentElement;

const state = {
  presets: []
};
const statusTimers = new WeakMap();

function setStatus(message) {
  const existingTimer = statusTimers.get(status);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
    statusTimers.delete(status);
  }

  status.textContent = message;

  if (!message) {
    return;
  }

  const timerId = window.setTimeout(() => {
    if (statusTimers.get(status) !== timerId) {
      return;
    }

    statusTimers.delete(status);
    status.textContent = "";
  }, 5000);

  statusTimers.set(status, timerId);
}

function normalizePresetList(presets) {
  return (Array.isArray(presets) ? presets : [])
    .filter((preset) => preset && typeof preset === "object" && typeof preset.id === "string")
    .map((preset, index) => ({
      ...preset,
      order: Number.isFinite(preset.order) ? preset.order : index
    }))
    .sort((left, right) => left.order - right.order);
}

function presetOptionValue(id) {
  return `preset:${id}`;
}

function findMatchingPreset(settings) {
  return state.presets.find(
    (preset) =>
      preset.interfaceLanguage === settings.interfaceLanguage &&
      preset.resultsLanguage === settings.resultsLanguage &&
      preset.region === settings.region
  );
}

function appendOption(parent, value, label, disabled = false) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.disabled = disabled;
  parent.appendChild(option);
}

function renderBasicLanguageSelect(settings) {
  const selectedValue = deriveBasicValue(settings);
  basicLanguageInput.textContent = "";

  appendOption(basicLanguageInput, "auto", getMessage("option_auto") || "Auto");

  const languageGroup = document.createElement("optgroup");
  languageGroup.label = getMessage("optiongroup_languages") || "Languages";
  for (const code of LANGUAGE_CODES) {
    appendOption(languageGroup, code, buildLanguageLabel(code));
  }
  basicLanguageInput.appendChild(languageGroup);

  if (state.presets.length > 0) {
    const presetGroup = document.createElement("optgroup");
    presetGroup.label = getMessage("optiongroup_presets") || "Presets";
    for (const preset of state.presets) {
      appendOption(presetGroup, presetOptionValue(preset.id), preset.name);
    }
    basicLanguageInput.appendChild(presetGroup);
  }

  appendOption(
    basicLanguageInput,
    CUSTOM_BASIC_VALUE,
    getMessage("option_custom") || "Custom",
    true
  );

  basicLanguageInput.value = selectedValue;
  ensureValidValue(basicLanguageInput, "auto");
}

function applySettings(settings) {
  interfaceInput.value = settings.interfaceLanguage;
  resultsInput.value = settings.resultsLanguage;
  regionInput.value = settings.region;

  ensureValidValue(interfaceInput, DEFAULT_SETTINGS.interfaceLanguage);
  ensureValidValue(resultsInput, DEFAULT_SETTINGS.resultsLanguage);
  ensureValidValue(regionInput, DEFAULT_SETTINGS.region);
  renderBasicLanguageSelect(settings);
}

function readSettingsFromForm() {
  return {
    interfaceLanguage: interfaceInput.value,
    resultsLanguage: resultsInput.value,
    region: regionInput.value
  };
}

function deriveBasicValue(settings) {
  const matchingPreset = findMatchingPreset(settings);
  if (matchingPreset) {
    return presetOptionValue(matchingPreset.id);
  }

  if (
    settings.interfaceLanguage === "auto" &&
    settings.resultsLanguage === "any" &&
    settings.region === "auto"
  ) {
    return "auto";
  }

  if (
    settings.interfaceLanguage === settings.resultsLanguage &&
    LANGUAGE_CODES.includes(settings.interfaceLanguage) &&
    settings.region === "auto"
  ) {
    return settings.interfaceLanguage;
  }

  return CUSTOM_BASIC_VALUE;
}

function applyBasicValue(value) {
  if (value === "auto") {
    interfaceInput.value = "auto";
    resultsInput.value = "any";
    regionInput.value = "auto";
    return;
  }

  if (value.startsWith("preset:")) {
    const preset = state.presets.find((item) => presetOptionValue(item.id) === value);
    if (preset) {
      interfaceInput.value = preset.interfaceLanguage;
      resultsInput.value = preset.resultsLanguage;
      regionInput.value = preset.region;
    }
    return;
  }

  if (LANGUAGE_CODES.includes(value)) {
    interfaceInput.value = value;
    resultsInput.value = value;
    regionInput.value = "auto";
  }
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

function setAdvancedOpen(open) {
  advancedSection.classList.toggle("is-open", open);
  advancedSection.setAttribute("aria-hidden", open ? "false" : "true");
  advancedToggle.dataset.expanded = open ? "true" : "false";
  advancedToggleLabel.textContent = getMessage(open ? "hide_advanced" : "show_advanced");
}

function refreshFromStorage() {
  chrome.storage.sync.get({ ...DEFAULT_SETTINGS, ...DEFAULT_UI_STATE, [PRESETS_KEY]: [] }, (stored) => {
    state.presets = normalizePresetList(stored[PRESETS_KEY]);
    applySettings(stored);
    applyTheme({
      body: document.body,
      toggleButton: themeToggle,
      iconElement: themeToggleIcon,
      mediaQuery: themeMedia,
      themePreference: stored.themePreference || DEFAULT_THEME
    });
    setAdvancedOpen(Boolean(stored.advancedOpen));
  });
}

localizeStaticText();
populateSelect(interfaceInput, buildInterfaceLanguageOptions());
populateSelect(resultsInput, buildResultsLanguageOptions());
populateSelect(regionInput, buildRegionOptions());
popupRoot.lang = chrome.i18n.getUILanguage();
refreshFromStorage();

for (const select of [basicLanguageInput, interfaceInput, resultsInput, regionInput]) {
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

basicLanguageInput.addEventListener("change", () => {
  if (basicLanguageInput.value !== CUSTOM_BASIC_VALUE) {
    applyBasicValue(basicLanguageInput.value);
  }
  renderBasicLanguageSelect(readSettingsFromForm());
  setFieldActiveState(basicLanguageInput, false);
  basicLanguageInput.blur();
});

for (const select of [interfaceInput, resultsInput, regionInput]) {
  select.addEventListener("change", () => {
    renderBasicLanguageSelect(readSettingsFromForm());
  });
}

advancedToggle.addEventListener("click", () => {
  const nextOpen = advancedToggle.dataset.expanded !== "true";
  setAdvancedOpen(nextOpen);
  chrome.storage.sync.set({ advancedOpen: nextOpen });
  advancedToggle.blur();
});

themeToggle.addEventListener("click", () => {
  const currentTheme = themeToggle.dataset.themePreference || DEFAULT_THEME;
  const nextIndex = (THEME_ORDER.indexOf(currentTheme) + 1) % THEME_ORDER.length;
  const nextTheme = THEME_ORDER[nextIndex];

  applyTheme({
    body: document.body,
    toggleButton: themeToggle,
    iconElement: themeToggleIcon,
    mediaQuery: themeMedia,
    themePreference: nextTheme,
    animated: true
  });
  chrome.storage.sync.set({ themePreference: nextTheme });
  themeToggle.blur();
});

themeMedia.addEventListener("change", () => {
  chrome.storage.sync.get({ themePreference: DEFAULT_THEME }, (settings) => {
    if ((settings.themePreference || DEFAULT_THEME) === "system") {
      applyTheme({
        body: document.body,
        toggleButton: themeToggle,
        iconElement: themeToggleIcon,
        mediaQuery: themeMedia,
        themePreference: "system"
      });
    }
  });
});

managePresetsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  managePresetsButton.blur();
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
  applySettings(LIVE_SETTING_DEFAULTS);
  chrome.storage.sync.set({ ...LIVE_SETTING_DEFAULTS }, () => {
    setStatus(getMessage("status_reset") || "Default settings restored.");
    reloadActiveTab();
  });
  defaultsButton.blur();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (changes.themePreference) {
    applyTheme({
      body: document.body,
      toggleButton: themeToggle,
      iconElement: themeToggleIcon,
      mediaQuery: themeMedia,
      themePreference: changes.themePreference.newValue || DEFAULT_THEME
    });
  }

  if (changes[PRESETS_KEY]) {
    state.presets = normalizePresetList(changes[PRESETS_KEY].newValue);
    renderBasicLanguageSelect(readSettingsFromForm());
  }

  if (changes.interfaceLanguage || changes.resultsLanguage || changes.region) {
    applySettings({
      interfaceLanguage: changes.interfaceLanguage?.newValue ?? interfaceInput.value,
      resultsLanguage: changes.resultsLanguage?.newValue ?? resultsInput.value,
      region: changes.region?.newValue ?? regionInput.value
    });
  }
});

window.addEventListener("focus", refreshFromStorage);
