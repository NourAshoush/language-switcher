(function () {
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

  const DEFAULT_THEME = "system";
  const THEME_ORDER = ["system", "dark", "light"];
  const THEME_ICONS = {
    system: `<span class="theme-mode-icon theme-mode-system"></span>`,
    dark: `<span class="theme-mode-icon theme-mode-dark"></span>`,
    light: `<span class="theme-mode-icon theme-mode-light"></span>`
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

  function localizeStaticText(root = document) {
    for (const element of root.querySelectorAll("[data-i18n]")) {
      const key = element.dataset.i18n;
      const message = getMessage(key);
      if (message) {
        element.textContent = message;
      }
    }

    for (const element of root.querySelectorAll("[data-i18n-aria-label]")) {
      const key = element.dataset.i18nAriaLabel;
      const message = getMessage(key);
      if (message) {
        element.setAttribute("aria-label", message);
      }
    }

    for (const element of root.querySelectorAll("[data-i18n-title]")) {
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

  function buildInterfaceLanguageOptions() {
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

  function buildBasicLanguageOptions(customValue) {
    return [
      { value: "auto", label: getMessage("option_auto") || "Auto" },
      ...LANGUAGE_CODES.map((code) => ({
        value: code,
        label: buildLanguageLabel(code)
      })),
      {
        value: customValue,
        label: getMessage("option_custom") || "Custom",
        disabled: true
      }
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

  function populateSelect(select, options) {
    select.textContent = "";
    for (const option of options) {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      if (option.disabled) {
        element.disabled = true;
      }
      select.appendChild(element);
    }
  }

  function ensureValidValue(select, fallback) {
    const values = Array.from(select.options, (option) => option.value);

    if (!values.includes(select.value)) {
      select.value = fallback;
    }
  }

  function getResolvedTheme(themePreference, mediaQuery) {
    if (themePreference === "system") {
      return mediaQuery.matches ? "dark" : "light";
    }

    return themePreference;
  }

  function renderTheme({ body, toggleButton, iconElement, mediaQuery, themePreference }) {
    const resolvedTheme = getResolvedTheme(themePreference, mediaQuery);
    body.dataset.theme = resolvedTheme;
    toggleButton.dataset.themePreference = themePreference;

    if (iconElement) {
      iconElement.innerHTML = THEME_ICONS[themePreference];
    }
  }

  function applyTheme({
    body,
    toggleButton,
    iconElement,
    mediaQuery,
    themePreference,
    animated = false
  }) {
    if (!animated) {
      renderTheme({ body, toggleButton, iconElement, mediaQuery, themePreference });
      return;
    }

    toggleButton.classList.add("is-transitioning");

    window.setTimeout(() => {
      renderTheme({ body, toggleButton, iconElement, mediaQuery, themePreference });
      toggleButton.classList.remove("is-transitioning");
    }, 120);
  }

  function formatInterfaceLanguageValue(value) {
    if (!value || value === "auto") {
      return getMessage("option_auto") || "Auto";
    }

    return buildLanguageLabel(value);
  }

  function formatResultsLanguageValue(value) {
    if (!value || value === "any") {
      return getMessage("option_any_language") || "Any language";
    }

    return buildLanguageLabel(value);
  }

  function formatRegionValue(value) {
    if (!value || value === "auto") {
      return getMessage("option_auto") || "Auto";
    }

    return getMessage(`region_name_${value}`) || value.toUpperCase();
  }

  window.LanguageSwitcherShared = {
    DEFAULT_SETTINGS,
    DEFAULT_THEME,
    THEME_ORDER,
    LANGUAGE_CODES,
    REGION_CODES,
    getMessage,
    localizeStaticText,
    buildInterfaceLanguageOptions,
    buildResultsLanguageOptions,
    buildBasicLanguageOptions,
    buildRegionOptions,
    buildLanguageLabel,
    populateSelect,
    ensureValidValue,
    applyTheme,
    formatInterfaceLanguageValue,
    formatResultsLanguageValue,
    formatRegionValue
  };
})();
