const {
  DEFAULT_SETTINGS,
  DEFAULT_THEME,
  THEME_ORDER,
  LANGUAGE_CODES,
  REGION_CODES,
  getMessage,
  localizeStaticText,
  buildInterfaceLanguageOptions,
  buildResultsLanguageOptions,
  buildRegionOptions,
  populateSelect,
  ensureValidValue,
  applyTheme,
  formatInterfaceLanguageValue,
  formatResultsLanguageValue,
  formatRegionValue
} = window.LanguageSwitcherShared;

const PRESETS_KEY = "presets";
const STATS_KEY = "usageStats";
const STORAGE_DEFAULTS = {
  ...DEFAULT_SETTINGS,
  themePreference: DEFAULT_THEME,
  [PRESETS_KEY]: []
};
const LOCAL_STORAGE_DEFAULTS = {
  [STATS_KEY]: {
    total: 0,
    daily: {}
  }
};

const ICONS = {
  add: `
    <svg viewBox="0 0 16 16" fill="none" stroke-width="1.5" stroke-linecap="round">
      <path d="M8 3.2v9.6"></path>
      <path d="M3.2 8h9.6"></path>
    </svg>
  `,
  apply: `<span class="asset-icon asset-icon-check"></span>`,
  edit: `<span class="asset-icon asset-icon-pencil"></span>`,
  delete: `<span class="asset-icon asset-icon-trash"></span>`,
  keep: `<span class="asset-icon asset-icon-check"></span>`,
  drag: `
    <svg viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5.2" cy="4.5" r="1"></circle>
      <circle cx="10.8" cy="4.5" r="1"></circle>
      <circle cx="5.2" cy="8" r="1"></circle>
      <circle cx="10.8" cy="8" r="1"></circle>
      <circle cx="5.2" cy="11.5" r="1"></circle>
      <circle cx="10.8" cy="11.5" r="1"></circle>
    </svg>
  `
};

const themeToggle = document.getElementById("themeToggle");
const themeToggleIcon = document.getElementById("themeToggleIcon");
const sidebarLinks = Array.from(document.querySelectorAll(".sidebar-link"));
const overviewSection = document.getElementById("overviewSection");
const scopeSection = document.getElementById("scopeSection");
const presetsSection = document.getElementById("presetsSection");
const statsTotal = document.getElementById("statsTotal");
const statsRangeMetricLabel = document.getElementById("statsRangeMetricLabel");
const statsLastSevenDays = document.getElementById("statsLastSevenDays");
const statsStatus = document.getElementById("statsStatus");
const statsChart = document.getElementById("statsChart");
const statsAreaPath = document.getElementById("statsAreaPath");
const statsLinePath = document.getElementById("statsLinePath");
const statsChartEmpty = document.getElementById("statsChartEmpty");
const statsLabels = document.getElementById("statsLabels");
const rangeButtons = Array.from(document.querySelectorAll(".range-button"));
const scopeStatus = document.getElementById("scopeStatus");
const applyToSearchInput = document.getElementById("applyToSearch");
const applyToMapsInput = document.getElementById("applyToMaps");
const applyToImagesInput = document.getElementById("applyToImages");
const applyToNewsInput = document.getElementById("applyToNews");
const applyToShoppingInput = document.getElementById("applyToShopping");
const applyToFlightsInput = document.getElementById("applyToFlights");
const applyToHotelsInput = document.getElementById("applyToHotels");
const applyToVideosInput = document.getElementById("applyToVideos");
const applyToBooksInput = document.getElementById("applyToBooks");
const newPresetButton = document.getElementById("newPresetButton");
const emptyState = document.getElementById("emptyState");
const presetList = document.getElementById("presetList");
const presetListStatus = document.getElementById("presetListStatus");
const editorCard = document.getElementById("editorCard");
const editorTitle = document.getElementById("editorTitle");
const editorConflictMessage = document.getElementById("editorConflictMessage");
const presetForm = document.getElementById("presetForm");
const presetNameField = document.getElementById("presetNameField");
const presetNameInput = document.getElementById("presetName");
const presetNameSupportingText = document.getElementById("presetNameSupportingText");
const editorInterfaceInput = document.getElementById("editorInterfaceLanguage");
const editorResultsInput = document.getElementById("editorResultsLanguage");
const editorRegionInput = document.getElementById("editorRegion");
const savePresetButton = document.getElementById("savePresetButton");
const cancelPresetButton = document.getElementById("cancelPresetButton");
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");

const state = {
  settings: { ...DEFAULT_SETTINGS },
  presets: [],
  usageStats: { total: 0, daily: {} },
  themePreference: DEFAULT_THEME,
  statsRange: "week",
  editingPresetId: null,
  highlightPresetId: null,
  draggingPresetId: null
};
const statusTimers = new WeakMap();

const PRESET_NAME_HELPER =
  getMessage("preset_name_supporting") ||
  presetNameSupportingText.dataset.defaultMessage ||
  "Use a name you'll recognize later.";

const SCOPE_FIELDS = [
  [applyToSearchInput, "applyToSearch", "options_scope_search_title"],
  [applyToMapsInput, "applyToMaps", "options_scope_maps_title"],
  [applyToImagesInput, "applyToImages", "options_scope_images_title"],
  [applyToNewsInput, "applyToNews", "options_scope_news_title"],
  [applyToShoppingInput, "applyToShopping", "options_scope_shopping_title"],
  [applyToFlightsInput, "applyToFlights", "options_scope_flights_title"],
  [applyToHotelsInput, "applyToHotels", "options_scope_hotels_title"],
  [applyToVideosInput, "applyToVideos", "options_scope_videos_title"],
  [applyToBooksInput, "applyToBooks", "options_scope_books_title"]
];

function capitalizeMessage(message) {
  if (!message) {
    return "";
  }

  return message.replace(/^(\s*)(\p{Ll})/u, (_, prefix, character) => {
    return `${prefix}${character.toLocaleUpperCase(chrome.i18n.getUILanguage())}`;
  });
}

function clearStatusTimer(element) {
  const timerId = statusTimers.get(element);
  if (timerId) {
    window.clearTimeout(timerId);
    statusTimers.delete(element);
  }
}

function setStatus(element, message, tone = "neutral") {
  clearStatusTimer(element);
  element.textContent = capitalizeMessage(message);

  if (message) {
    element.dataset.tone = tone;
  } else {
    delete element.dataset.tone;
  }

  if (message) {
    const timerId = window.setTimeout(() => {
      if (statusTimers.get(element) !== timerId) {
        return;
      }

      statusTimers.delete(element);
      element.textContent = "";
      delete element.dataset.tone;
    }, 5000);

    statusTimers.set(element, timerId);
  }
}

function setListStatus(message, tone = "neutral") {
  setStatus(presetListStatus, message, tone);
}

function setStatsStatus(message, tone = "neutral") {
  setStatus(statsStatus, message, tone);
}

function setScopeStatus(message, tone = "neutral") {
  setStatus(scopeStatus, message, tone);
}

function syncPresetNameField() {
  presetNameField.classList.toggle("has-value", Boolean(presetNameInput.value.trim()));
}

function clearPresetNameError() {
  presetNameField.classList.remove("is-invalid");
  presetNameSupportingText.textContent = PRESET_NAME_HELPER;
  presetNameInput.setAttribute("aria-invalid", "false");
}

function showPresetNameError(message) {
  presetNameField.classList.add("is-invalid");
  presetNameSupportingText.textContent = message;
  presetNameInput.setAttribute("aria-invalid", "true");
}

function clearEditorConflict() {
  clearStatusTimer(editorConflictMessage);
  editorConflictMessage.textContent = "";
  delete editorConflictMessage.dataset.tone;
}

function showEditorConflict(message) {
  setStatus(editorConflictMessage, message, "danger");
}

function generatePresetId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `preset-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
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

  return normalized;
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getLastDays(count) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    days.push(date);
  }

  return days;
}

function startOfMonth(date) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getMonthlyBuckets(monthCount) {
  const buckets = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonth = startOfMonth(today);

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const bucketDate = new Date(currentMonth);
    bucketDate.setMonth(currentMonth.getMonth() - index);
    buckets.push(bucketDate);
  }

  return buckets;
}

function getAllTimeMonthlyBuckets(stats) {
  const keys = Object.keys(stats.daily).sort();
  if (keys.length === 0) {
    return getMonthlyBuckets(1);
  }

  const first = startOfMonth(new Date(`${keys[0]}T00:00:00`));
  const last = startOfMonth(new Date());
  const buckets = [];
  const cursor = new Date(first);

  while (cursor <= last) {
    buckets.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

function buildSeriesForRange(stats, range) {
  const locale = chrome.i18n.getUILanguage();

  if (range === "year" || range === "all") {
    const buckets = range === "year" ? getMonthlyBuckets(12) : getAllTimeMonthlyBuckets(stats);
    const formatter = new Intl.DateTimeFormat(locale, { month: "short" });

    return buckets.map((monthStart) => {
      const year = monthStart.getFullYear();
      const month = monthStart.getMonth();
      let value = 0;

      for (const [dateKey, count] of Object.entries(stats.daily)) {
        const date = new Date(`${dateKey}T00:00:00`);
        if (date.getFullYear() === year && date.getMonth() === month) {
          value += count;
        }
      }

      const label =
        range === "all"
          ? `${formatter.format(monthStart)} ${String(year).slice(-2)}`
          : formatter.format(monthStart);

      return { label, value };
    });
  }

  const dayCount = range === "month" ? 28 : 7;
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: dayCount === 7 ? "short" : undefined,
    month: dayCount === 28 ? "short" : undefined,
    day: dayCount === 28 ? "numeric" : undefined
  });

  return getLastDays(dayCount).map((date) => ({
    label: formatter.format(date),
    value: stats.daily[getDateKey(date)] || 0
  }));
}

function getRangeMetricLabel(range) {
  return (
    getMessage(`options_stats_metric_${range}`) ||
    getMessage("options_stats_selected_range") ||
    "Selected range"
  );
}

function buildChartPath(points) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}

function buildSmoothChartPath(points) {
  if (points.length === 0) {
    return "";
  }

  if (points.length < 3) {
    return buildChartPath(points);
  }

  let path = `M ${points[0][0]} ${points[0][1]}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] || current;
    const afterNext = points[index + 2] || next;

    const controlPoint1X = current[0] + (next[0] - previous[0]) / 5;
    const controlPoint1Y = current[1] + (next[1] - previous[1]) / 5;
    const controlPoint2X = next[0] - (afterNext[0] - current[0]) / 5;
    const controlPoint2Y = next[1] - (afterNext[1] - current[1]) / 5;
    const minY = Math.min(current[1], next[1]);
    const maxY = Math.max(current[1], next[1]);
    const boundedControlPoint1Y = Math.min(maxY, Math.max(minY, controlPoint1Y));
    const boundedControlPoint2Y = Math.min(maxY, Math.max(minY, controlPoint2Y));

    path += ` C ${controlPoint1X.toFixed(2)} ${boundedControlPoint1Y.toFixed(2)}, ${controlPoint2X.toFixed(2)} ${boundedControlPoint2Y.toFixed(2)}, ${next[0]} ${next[1]}`;
  }

  return path;
}

function renderStats() {
  const stats = state.usageStats;
  const series = buildSeriesForRange(stats, state.statsRange);
  const rangeTotal = series.reduce((sum, item) => sum + item.value, 0);

  statsTotal.textContent = String(stats.total);
  statsRangeMetricLabel.textContent = getRangeMetricLabel(state.statsRange);
  statsLastSevenDays.textContent = String(rangeTotal);
  for (const button of rangeButtons) {
    button.classList.toggle("is-active", button.dataset.range === state.statsRange);
  }

  statsLabels.textContent = "";
  const labelStep =
    state.statsRange === "year"
      ? 1
      : state.statsRange === "month"
        ? 7
        : Math.max(1, Math.ceil(series.length / 7));

  const maxValue = Math.max(...series.map((item) => item.value), 0);
  if (maxValue === 0) {
    statsAreaPath.setAttribute("d", "");
    statsLinePath.setAttribute("d", "");
    statsChartEmpty.hidden = false;
    statsChart.setAttribute("aria-hidden", "true");
    return;
  }

  statsChartEmpty.hidden = true;
  statsChart.setAttribute("aria-hidden", "false");

  const width = 320;
  const height = 148;
  const left = 18;
  const right = width - 18;
  const top = 18;
  const bottom = height - 18;
  const step = (right - left) / Math.max(series.length - 1, 1);
  const points = series.map((item, index) => {
    const x = left + step * index;
    const ratio = item.value / maxValue;
    const y = bottom - (bottom - top) * ratio;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });

  for (const [index, item] of series.entries()) {
    const shouldShowLabel =
      state.statsRange === "month"
        ? index === 0 || index === series.length - 1 || (series.length - 1 - index) % labelStep === 0
        : state.statsRange === "year"
          ? true
          : true;

    if (!shouldShowLabel) {
      continue;
    }

    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = item.label;
    label.style.left = `${(points[index][0] / width) * 100}%`;
    statsLabels.appendChild(label);
  }

  const linePath = buildSmoothChartPath(points);
  const areaPath = `${linePath} L ${right} ${bottom} L ${left} ${bottom} Z`;

  statsLinePath.setAttribute("d", linePath);
  statsAreaPath.setAttribute("d", areaPath);
}

function activateSidebarLink(sectionId) {
  for (const link of sidebarLinks) {
    link.classList.toggle("is-active", link.dataset.target === sectionId);
  }
}

function normalizePreset(preset, index = 0) {
  if (!preset || typeof preset !== "object") {
    return null;
  }

  const interfaceLanguage = LANGUAGE_CODES.includes(preset.interfaceLanguage)
    ? preset.interfaceLanguage
    : DEFAULT_SETTINGS.interfaceLanguage;
  const resultsLanguage =
    preset.resultsLanguage === "any" || LANGUAGE_CODES.includes(preset.resultsLanguage)
      ? preset.resultsLanguage
      : DEFAULT_SETTINGS.resultsLanguage;
  const region = REGION_CODES.includes(preset.region) ? preset.region : DEFAULT_SETTINGS.region;

  return {
    id: typeof preset.id === "string" && preset.id ? preset.id : generatePresetId(),
    name: typeof preset.name === "string" ? preset.name.trim() : "",
    interfaceLanguage,
    resultsLanguage,
    region,
    createdAt: Number.isFinite(preset.createdAt) ? preset.createdAt : Date.now(),
    updatedAt: Number.isFinite(preset.updatedAt) ? preset.updatedAt : Date.now(),
    order: Number.isFinite(preset.order) ? preset.order : index
  };
}

function normalizePresetList(presets) {
  return (Array.isArray(presets) ? presets : [])
    .map((preset, index) => normalizePreset(preset, index))
    .filter(Boolean)
    .sort((left, right) => left.order - right.order)
    .map((preset, index) => ({ ...preset, order: index }));
}

function findDuplicatePreset(candidatePreset) {
  return state.presets.find((preset) => {
    if (preset.id === candidatePreset.id) {
      return false;
    }

    return (
      preset.interfaceLanguage === candidatePreset.interfaceLanguage &&
      preset.resultsLanguage === candidatePreset.resultsLanguage &&
      preset.region === candidatePreset.region
    );
  });
}

function getPresetDisplayName(preset) {
  const name = typeof preset?.name === "string" ? preset.name.trim() : "";
  return name || "Untitled preset";
}

function normalizePresetName(name) {
  return typeof name === "string" ? name.trim().toLocaleLowerCase(chrome.i18n.getUILanguage()) : "";
}

function findDuplicatePresetName(name, currentPresetId = null) {
  const normalizedName = normalizePresetName(name);
  if (!normalizedName) {
    return null;
  }

  return state.presets.find((preset) => {
    if (preset.id === currentPresetId) {
      return false;
    }

    return normalizePresetName(preset.name) === normalizedName;
  });
}

function getDuplicatePresetMessage(preset) {
  const presetName = getPresetDisplayName(preset);
  return (
    getMessage("validation_preset_duplicate_named", [presetName]) ||
    'These settings already match "$1".'.replace("$1", presetName)
  );
}

function getDraftPreset() {
  return normalizePreset(
    {
      id: state.editingPresetId || "__draft__",
      name: presetNameInput.value.trim(),
      interfaceLanguage: editorInterfaceInput.value,
      resultsLanguage: editorResultsInput.value,
      region: editorRegionInput.value,
      order: 0
    },
    0
  );
}

function syncEditorConflictState() {
  const draftPreset = getDraftPreset();
  if (!draftPreset) {
    clearEditorConflict();
    return;
  }

  const duplicatePreset = findDuplicatePreset(draftPreset);
  if (!duplicatePreset) {
    clearEditorConflict();
    return;
  }

  showEditorConflict(getDuplicatePresetMessage(duplicatePreset));
}

function persistPresets(statusMessage) {
  state.presets = state.presets.map((preset, index) => ({
    ...preset,
    order: index,
    updatedAt: preset.updatedAt || Date.now()
  }));

  chrome.storage.sync.set({ [PRESETS_KEY]: state.presets }, () => {
    renderPresets();
    if (statusMessage) {
      setListStatus(statusMessage, "success");
    }
  });
}

function matchesCurrentSettings(preset) {
  return (
    preset.interfaceLanguage === state.settings.interfaceLanguage &&
    preset.resultsLanguage === state.settings.resultsLanguage &&
    preset.region === state.settings.region
  );
}

function setButtonContent(button, icon, label) {
  button.innerHTML = `
    <span class="button-inner">
      <span class="button-icon" aria-hidden="true">${icon}</span>
      <span class="button-label">${label}</span>
    </span>
  `;
}

function decorateStaticButtons() {
  setButtonContent(newPresetButton, ICONS.add, getMessage("options_new_preset") || "New preset");
}

function openEditor(mode, preset = null) {
  clearDragClasses();
  state.editingPresetId = preset ? preset.id : null;
  editorTitle.textContent =
    mode === "edit"
      ? getMessage("options_editor_edit_title") || "Edit preset"
      : getMessage("options_editor_new_title") || "New preset";

  if (preset) {
    presetNameInput.value = preset.name;
    editorInterfaceInput.value = preset.interfaceLanguage;
    editorResultsInput.value = preset.resultsLanguage;
    editorRegionInput.value = preset.region;
  } else {
    presetNameInput.value = "";
    editorInterfaceInput.value = state.settings.interfaceLanguage;
    editorResultsInput.value = state.settings.resultsLanguage;
    editorRegionInput.value = state.settings.region;
  }

  ensureValidValue(editorInterfaceInput, DEFAULT_SETTINGS.interfaceLanguage);
  ensureValidValue(editorResultsInput, DEFAULT_SETTINGS.resultsLanguage);
  ensureValidValue(editorRegionInput, DEFAULT_SETTINGS.region);
  clearPresetNameError();
  clearEditorConflict();
  syncPresetNameField();

  editorCard.hidden = false;
}

function closeEditor() {
  state.editingPresetId = null;
  editorCard.hidden = true;
  clearPresetNameError();
  clearEditorConflict();
}

function makeSummaryLine(preset) {
  return [
    `${getMessage("label_interface_language") || "Interface language"}: ${formatInterfaceLanguageValue(
      preset.interfaceLanguage
    )}`,
    `${getMessage("label_results_language") || "Results language"}: ${formatResultsLanguageValue(
      preset.resultsLanguage
    )}`,
    `${getMessage("label_region") || "Region"}: ${formatRegionValue(preset.region)}`
  ].join(" \u2022 ");
}

function clearDragClasses() {
  for (const element of presetList.querySelectorAll(".is-drag-over-before, .is-drag-over-after, .is-dragging")) {
    element.classList.remove("is-drag-over-before", "is-drag-over-after", "is-dragging");
  }
}

function movePreset(movedId, targetId, placeAfterTarget) {
  if (!movedId || !targetId || movedId === targetId) {
    return;
  }

  const presets = [...state.presets];
  const movedIndex = presets.findIndex((preset) => preset.id === movedId);
  const targetIndex = presets.findIndex((preset) => preset.id === targetId);

  if (movedIndex === -1 || targetIndex === -1) {
    return;
  }

  const [movedPreset] = presets.splice(movedIndex, 1);
  const insertIndex = presets.findIndex((preset) => preset.id === targetId) + (placeAfterTarget ? 1 : 0);
  presets.splice(insertIndex, 0, movedPreset);
  state.presets = presets;
  persistPresets(getMessage("status_preset_reordered") || "Preset order updated.");
}

function renderPresets() {
  const presets = state.presets;
  let highlightedCard = null;

  emptyState.hidden = presets.length > 0;
  newPresetButton.hidden = presets.length === 0;
  presetList.textContent = "";

  for (const preset of presets) {
    const card = document.createElement("article");
    card.className = "preset-card";
    card.draggable = true;
    card.dataset.presetId = preset.id;

    if (state.highlightPresetId === preset.id) {
      card.classList.add("is-highlighted");
      highlightedCard = card;
    }

    card.addEventListener("dragstart", (event) => {
      state.draggingPresetId = preset.id;
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", preset.id);
    });

    card.addEventListener("dragend", () => {
      state.draggingPresetId = null;
      clearDragClasses();
    });

    card.addEventListener("dragover", (event) => {
      if (!state.draggingPresetId || state.draggingPresetId === preset.id) {
        return;
      }

      event.preventDefault();
      const rect = card.getBoundingClientRect();
      const placeAfterTarget = event.clientY > rect.top + rect.height / 2;
      card.classList.toggle("is-drag-over-after", placeAfterTarget);
      card.classList.toggle("is-drag-over-before", !placeAfterTarget);
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("is-drag-over-before", "is-drag-over-after");
    });

    card.addEventListener("drop", (event) => {
      if (!state.draggingPresetId || state.draggingPresetId === preset.id) {
        return;
      }

      event.preventDefault();
      const rect = card.getBoundingClientRect();
      const placeAfterTarget = event.clientY > rect.top + rect.height / 2;
      clearDragClasses();
      movePreset(state.draggingPresetId, preset.id, placeAfterTarget);
      state.draggingPresetId = null;
    });

    const main = document.createElement("div");
    main.className = "preset-card-main";

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.innerHTML = ICONS.drag;

    const content = document.createElement("div");
    content.className = "preset-card-content";

    const title = document.createElement("h3");
    title.className = "preset-title";
    title.textContent = getPresetDisplayName(preset);
    const isActivePreset = matchesCurrentSettings(preset);

    if (isActivePreset) {
      const badge = document.createElement("span");
      badge.className = "preset-current-pill";
      badge.textContent = getMessage("preset_current_tag") || "Current";
      title.appendChild(document.createTextNode(" "));
      title.appendChild(badge);
    }

    const summary = document.createElement("p");
    summary.className = "preset-meta";
    summary.textContent = makeSummaryLine(preset);

    content.append(title, summary);
    main.append(handle, content);
    const actions = document.createElement("div");
    actions.className = "preset-card-actions";

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.className = `preset-action ${isActivePreset ? "is-applied" : "is-primary"}`;
    setButtonContent(
      applyButton,
      ICONS.apply,
      isActivePreset ? getMessage("button_applied") || "Applied" : getMessage("button_apply") || "Apply"
    );
    if (isActivePreset) {
      applyButton.disabled = true;
    } else {
      applyButton.addEventListener("click", () => {
        state.settings = {
          ...state.settings,
          interfaceLanguage: preset.interfaceLanguage,
          resultsLanguage: preset.resultsLanguage,
          region: preset.region
        };
        chrome.storage.sync.set(state.settings, () => {
          renderPresets();
          setListStatus(
            getMessage("status_preset_applied") ||
              "Preset applied. Changes take effect on the next Google search or after a refresh.",
            "success"
          );
        });
      });
    }

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary preset-action";
    setButtonContent(editButton, ICONS.edit, getMessage("button_edit") || "Edit");
    editButton.addEventListener("click", () => {
      openEditor("edit", preset);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary danger preset-action";
    setButtonContent(deleteButton, ICONS.delete, getMessage("button_delete") || "Delete");
    deleteButton.addEventListener("click", () => {
      state.presets = state.presets.filter((item) => item.id !== preset.id);
      persistPresets();
      setListStatus(getMessage("status_preset_deleted") || "Preset deleted.", "danger");
    });

    actions.append(applyButton, editButton, deleteButton);
    card.append(main, actions);

    presetList.appendChild(card);
  }

  if (highlightedCard) {
    window.requestAnimationFrame(() => {
      highlightedCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    window.setTimeout(() => {
      highlightedCard.classList.remove("is-highlighted");
      state.highlightPresetId = null;
    }, 2200);
  }
}

function savePreset(event) {
  event.preventDefault();

  const name = presetNameInput.value.trim();
  syncPresetNameField();

  if (!name) {
    showPresetNameError(getMessage("validation_preset_name") || "Enter a preset name.");
    presetNameInput.focus();
    return;
  }

  const duplicateNamePreset = findDuplicatePresetName(name, state.editingPresetId);
  if (duplicateNamePreset) {
    showPresetNameError(
      getMessage("validation_preset_name_duplicate", [getPresetDisplayName(duplicateNamePreset)]) ||
        'A preset named "$1" already exists.'.replace("$1", getPresetDisplayName(duplicateNamePreset))
    );
    return;
  }

  clearPresetNameError();

  const now = Date.now();
  const currentPreset = state.presets.find((preset) => preset.id === state.editingPresetId);
  const nextPreset = normalizePreset(
    {
      id: state.editingPresetId || generatePresetId(),
      name,
      interfaceLanguage: editorInterfaceInput.value,
      resultsLanguage: editorResultsInput.value,
      region: editorRegionInput.value,
      createdAt: currentPreset?.createdAt || now,
      updatedAt: now,
      order: currentPreset?.order ?? 0
    },
    currentPreset?.order ?? state.presets.length
  );

  if (!nextPreset) {
    return;
  }

  const duplicatePreset = findDuplicatePreset(nextPreset);
  if (duplicatePreset) {
    showEditorConflict(getDuplicatePresetMessage(duplicatePreset));
    return;
  }

  if (currentPreset) {
    state.presets = state.presets.map((preset) => (preset.id === nextPreset.id ? nextPreset : preset));
  } else {
    state.presets = [nextPreset, ...state.presets];
    state.presets = state.presets.map((preset, index) => ({ ...preset, order: index }));
  }

  state.highlightPresetId = nextPreset.id;

  chrome.storage.sync.set({ [PRESETS_KEY]: state.presets }, () => {
    closeEditor();
    renderPresets();
    setListStatus(
      getMessage("status_preset_saved") ||
        "Preset saved. Changes take effect on the next Google search or after a refresh.",
      "success"
    );
  });
}

function applyLoadedState(stored) {
  state.settings = {
    interfaceLanguage: stored.interfaceLanguage || DEFAULT_SETTINGS.interfaceLanguage,
    resultsLanguage: stored.resultsLanguage || DEFAULT_SETTINGS.resultsLanguage,
    region: stored.region || DEFAULT_SETTINGS.region,
    applyToSearch: stored.applyToSearch ?? DEFAULT_SETTINGS.applyToSearch,
    applyToMaps: stored.applyToMaps ?? DEFAULT_SETTINGS.applyToMaps,
    applyToImages: stored.applyToImages ?? DEFAULT_SETTINGS.applyToImages,
    applyToNews: stored.applyToNews ?? DEFAULT_SETTINGS.applyToNews,
    applyToShopping: stored.applyToShopping ?? DEFAULT_SETTINGS.applyToShopping,
    applyToFlights: stored.applyToFlights ?? DEFAULT_SETTINGS.applyToFlights,
    applyToHotels: stored.applyToHotels ?? DEFAULT_SETTINGS.applyToHotels,
    applyToVideos: stored.applyToVideos ?? DEFAULT_SETTINGS.applyToVideos,
    applyToBooks: stored.applyToBooks ?? DEFAULT_SETTINGS.applyToBooks
  };
  state.presets = normalizePresetList(stored[PRESETS_KEY]);
  state.themePreference = stored.themePreference || DEFAULT_THEME;
  for (const [input, key] of SCOPE_FIELDS) {
    input.checked = Boolean(state.settings[key]);
  }

  renderPresets();
  applyTheme({
    body: document.body,
    toggleButton: themeToggle,
    iconElement: themeToggleIcon,
    mediaQuery: themeMedia,
    themePreference: state.themePreference
  });
}

function refreshFromStorage() {
  chrome.storage.sync.get(STORAGE_DEFAULTS, (storedSync) => {
    applyLoadedState(storedSync);
    chrome.storage.local.get(LOCAL_STORAGE_DEFAULTS, (storedLocal) => {
      state.usageStats = normalizeUsageStats(storedLocal[STATS_KEY]);
      renderStats();
    });
  });
}

localizeStaticText();
document.title = getMessage("options_title") || "Options";
document.documentElement.lang = chrome.i18n.getUILanguage();
populateSelect(editorInterfaceInput, buildInterfaceLanguageOptions());
populateSelect(editorResultsInput, buildResultsLanguageOptions());
populateSelect(editorRegionInput, buildRegionOptions());
decorateStaticButtons();
refreshFromStorage();

themeToggle.addEventListener("click", () => {
  const currentTheme = themeToggle.dataset.themePreference || DEFAULT_THEME;
  const nextIndex = (THEME_ORDER.indexOf(currentTheme) + 1) % THEME_ORDER.length;
  const nextTheme = THEME_ORDER[nextIndex];

  state.themePreference = nextTheme;
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
  if ((themeToggle.dataset.themePreference || DEFAULT_THEME) === "system") {
    applyTheme({
      body: document.body,
      toggleButton: themeToggle,
      iconElement: themeToggleIcon,
      mediaQuery: themeMedia,
      themePreference: "system"
    });
  }
});

for (const link of sidebarLinks) {
  link.addEventListener("click", () => {
    const targetId = link.dataset.target;
    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    activateSidebarLink(targetId);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    link.blur();
  });
}

for (const button of rangeButtons) {
  button.addEventListener("click", () => {
    state.statsRange = button.dataset.range || "week";
    renderStats();
    button.blur();
  });
}

newPresetButton.addEventListener("click", () => {
  openEditor("new");
  editorCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

for (const [input, key, labelKey] of SCOPE_FIELDS) {
  input.addEventListener("change", () => {
    state.settings[key] = input.checked;
    chrome.storage.sync.set({ [key]: input.checked }, () => {
      setScopeStatus(
        (getMessage("options_scope_updated") || "$1 updated.").replace(
          "$1",
          getMessage(labelKey) || key
        ),
        "success"
      );
    });
  });
}

cancelPresetButton.addEventListener("click", () => {
  closeEditor();
});

presetNameInput.addEventListener("input", () => {
  syncPresetNameField();
  const name = presetNameInput.value.trim();
  const duplicateNamePreset = findDuplicatePresetName(name, state.editingPresetId);

  if (presetNameField.classList.contains("is-invalid")) {
    if (!name) {
      showPresetNameError(getMessage("validation_preset_name") || "Enter a preset name.");
    } else if (duplicateNamePreset) {
      showPresetNameError(
        getMessage("validation_preset_name_duplicate", [getPresetDisplayName(duplicateNamePreset)]) ||
          'A preset named "$1" already exists.'.replace("$1", getPresetDisplayName(duplicateNamePreset))
      );
    } else {
      clearPresetNameError();
    }
  }
  syncEditorConflictState();
});

for (const input of [editorInterfaceInput, editorResultsInput, editorRegionInput]) {
  input.addEventListener("change", () => {
    syncEditorConflictState();
  });
}

presetForm.addEventListener("submit", savePreset);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    if (changes.themePreference) {
      state.themePreference = changes.themePreference.newValue || DEFAULT_THEME;
      applyTheme({
        body: document.body,
        toggleButton: themeToggle,
        iconElement: themeToggleIcon,
        mediaQuery: themeMedia,
        themePreference: state.themePreference
      });
    }

    if (
      changes.interfaceLanguage ||
      changes.resultsLanguage ||
      changes.region ||
      changes.applyToSearch ||
      changes.applyToMaps ||
      changes.applyToImages ||
      changes.applyToNews ||
      changes.applyToShopping ||
      changes.applyToFlights ||
      changes.applyToHotels ||
      changes.applyToVideos ||
      changes.applyToBooks
    ) {
      state.settings = {
        interfaceLanguage: changes.interfaceLanguage?.newValue ?? state.settings.interfaceLanguage,
        resultsLanguage: changes.resultsLanguage?.newValue ?? state.settings.resultsLanguage,
        region: changes.region?.newValue ?? state.settings.region,
        applyToSearch: changes.applyToSearch?.newValue ?? state.settings.applyToSearch,
        applyToMaps: changes.applyToMaps?.newValue ?? state.settings.applyToMaps,
        applyToImages: changes.applyToImages?.newValue ?? state.settings.applyToImages,
        applyToNews: changes.applyToNews?.newValue ?? state.settings.applyToNews,
        applyToShopping: changes.applyToShopping?.newValue ?? state.settings.applyToShopping,
        applyToFlights: changes.applyToFlights?.newValue ?? state.settings.applyToFlights,
        applyToHotels: changes.applyToHotels?.newValue ?? state.settings.applyToHotels,
        applyToVideos: changes.applyToVideos?.newValue ?? state.settings.applyToVideos,
        applyToBooks: changes.applyToBooks?.newValue ?? state.settings.applyToBooks
      };
      for (const [input, key] of SCOPE_FIELDS) {
        input.checked = Boolean(state.settings[key]);
      }
      renderPresets();
    }

    if (changes[PRESETS_KEY]) {
      state.presets = normalizePresetList(changes[PRESETS_KEY].newValue);
      renderPresets();
    }
  }

  if (areaName === "local" && changes[STATS_KEY]) {
    state.usageStats = normalizeUsageStats(changes[STATS_KEY].newValue);
    renderStats();
  }
});

window.addEventListener("focus", refreshFromStorage);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshFromStorage();
  }
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

      if (visibleEntry) {
        activateSidebarLink(visibleEntry.target.id);
      }
    },
    {
      rootMargin: "-15% 0px -55% 0px",
      threshold: [0.2, 0.45, 0.7]
    }
  );

  observer.observe(overviewSection);
  observer.observe(scopeSection);
  observer.observe(presetsSection);
}
