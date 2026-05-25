const GOOGLE_SHEET_ID = "1_dWuZcHCB0_MwSL5PHTtXMPZgyGWTClt_cw_mCSC0ac";
const GOOGLE_SHEET_GID = "0";

const state = {
  events: [],
  filteredEvents: [],
  search: "",
  year: "all",
  sortOrder: "desc",
  keyEventsOnly: false,
  expandedIds: new Set(),
  allExpanded: false,
};

const INTRO_TEXT =
  "This timeline is a community-led best effort at tracking the changes and developments of the Hermantown Data Cetner project.";

const elements = {
  summary: document.querySelector("#timeline-summary"),
  searchInput: document.querySelector("#search-input"),
  yearFilter: document.querySelector("#year-filter"),
  sortOrder: document.querySelector("#sort-order"),
  keyEventsToggle: document.querySelector("#key-events-toggle"),
  expandToggle: document.querySelector("#expand-toggle"),
  emptyState: document.querySelector("#empty-state"),
  list: document.querySelector("#timeline-list"),
};

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getYear(dateString) {
  return String(new Date(`${dateString}T12:00:00`).getFullYear());
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;

  return ["true", "yes", "y", "1", "key", "starred"].includes(
    String(value ?? "").trim().toLowerCase(),
  );
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function parseSheetDate(value, formattedValue) {
  const formattedText = String(formattedValue ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(formattedText)) return formattedText;

  const valueText = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(valueText)) return valueText;

  const googleDate = valueText.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
  if (googleDate) {
    const [, year, zeroBasedMonth, day] = googleDate;
    return `${year}-${padNumber(Number(zeroBasedMonth) + 1)}-${padNumber(day)}`;
  }

  const parsed = new Date(valueText || formattedText);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return "";
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getSheetUrl(callbackName) {
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq`,
  );

  url.searchParams.set("gid", GOOGLE_SHEET_GID);
  url.searchParams.set("headers", "1");
  url.searchParams.set("tqx", `out:json;responseHandler:${callbackName}`);

  return url.toString();
}

function loadSheetResponse() {
  return new Promise((resolve, reject) => {
    const callbackName = `timelineSheetCallback_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheet data request timed out."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (response) => {
      cleanup();

      if (response.status !== "ok") {
        reject(new Error(response.errors?.[0]?.detailed_message || "Google Sheet data could not be loaded."));
        return;
      }

      resolve(response);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Google Sheet data could not be loaded."));
    };

    script.async = true;
    script.src = getSheetUrl(callbackName);
    document.head.append(script);
  });
}

function findColumn(columns, aliases) {
  const normalizedAliases = new Set(aliases);

  return columns.findIndex((column) => {
    const label = normalizeHeader(column.label);
    const id = normalizeHeader(column.id);
    return normalizedAliases.has(label) || normalizedAliases.has(id);
  });
}

function getCell(row, index) {
  return row.c?.[index] || {};
}

function getCellText(cell) {
  return String(cell.v ?? cell.f ?? "").trim();
}

function parseSheetEvents(response) {
  const columns = response.table?.cols || [];
  const rows = response.table?.rows || [];
  const dateIndex = findColumn(columns, ["date"]);
  const milestoneIndex = findColumn(columns, ["milestone"]);
  const notesIndex = findColumn(columns, ["notes", "note"]);
  const keyEventIndex = findColumn(columns, ["iskeyevent", "keyevent", "key"]);

  if (dateIndex === -1 || milestoneIndex === -1) {
    throw new Error("Google Sheet must include date and milestone columns.");
  }

  return rows
    .map((row, index) => {
      const dateCell = getCell(row, dateIndex);
      const milestone = getCellText(getCell(row, milestoneIndex));
      const notes = notesIndex === -1 ? "" : getCellText(getCell(row, notesIndex));
      const date = parseSheetDate(dateCell.v, dateCell.f);

      if (!date || !milestone) return null;

      return {
        id: `${date}-${slugify(milestone) || `event-${index + 1}`}`,
        date,
        milestone,
        notes,
        isKeyEvent:
          keyEventIndex !== -1 &&
          parseBoolean(getCell(row, keyEventIndex).v ?? getCell(row, keyEventIndex).f),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function emitHeight() {
  const height = Math.ceil(document.documentElement.scrollHeight);
  window.parent.postMessage(
    {
      source: "data-center-timeline",
      type: "resize",
      height,
    },
    "*",
  );
}

function updateStats() {
  if (!state.events.length) return;

  const years = new Set(state.events.map((event) => getYear(event.date)));

  elements.summary.textContent = INTRO_TEXT;

  elements.yearFilter.replaceChildren(
    new Option("All years", "all"),
    ...Array.from(years)
      .sort()
      .map((year) => new Option(year, year)),
  );
  elements.yearFilter.value = state.year;
}

function applyFilters() {
  const search = normalizeText(state.search).trim();

  state.filteredEvents = state.events
    .filter((event) => {
      const matchesYear = state.year === "all" || getYear(event.date) === state.year;
      const matchesKeyEvent = !state.keyEventsOnly || event.isKeyEvent;
      const matchesSearch =
        !search ||
        normalizeText(event.milestone).includes(search) ||
        normalizeText(event.notes).includes(search);

      return matchesYear && matchesKeyEvent && matchesSearch;
    })
    .sort((a, b) => {
      const result = a.date.localeCompare(b.date);
      return state.sortOrder === "asc" ? result : -result;
    });
}

function createChevron() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "chevron");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "m6 9 6 6 6-6");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2.4");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.append(path);
  return svg;
}

function createStarIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "key-event-star");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.6Z",
  );
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.append(path);
  return svg;
}

function createKeyEventBadge() {
  const badge = document.createElement("span");
  badge.className = "key-event-badge";

  const text = document.createElement("span");
  text.textContent = "Key event";

  badge.append(createStarIcon(), text);
  return badge;
}

function renderTimeline() {
  const fragment = document.createDocumentFragment();

  state.filteredEvents.forEach((event) => {
    const isOpen = state.expandedIds.has(event.id);
    const isKeyEvent = Boolean(event.isKeyEvent);
    const item = document.createElement("li");
    item.className = `timeline-item${isKeyEvent ? " is-key-event" : ""}`;

    const marker = document.createElement("span");
    marker.className = "timeline-marker";
    if (isKeyEvent) {
      marker.setAttribute("aria-label", "Key event");
      marker.setAttribute("role", "img");
    } else {
      marker.setAttribute("aria-hidden", "true");
    }

    const card = document.createElement("article");
    card.className = `event-card${isOpen ? " is-open" : ""}${isKeyEvent ? " is-key-event" : ""}`;

    const button = document.createElement("button");
    button.className = "event-button";
    button.type = "button";
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-controls", `details-${event.id}`);

    const date = document.createElement("span");
    date.className = "event-date";
    date.textContent = formatDate(event.date);

    const title = document.createElement("span");
    title.className = "event-title";
    title.textContent = event.milestone;

    const meta = document.createElement("span");
    meta.className = "event-meta";

    if (isKeyEvent) {
      meta.append(createKeyEventBadge());
    }
    meta.append(createChevron());
    button.append(date, title, meta);

    const details = document.createElement("div");
    details.className = "event-details";
    details.id = `details-${event.id}`;

    const detailsInner = document.createElement("div");
    detailsInner.className = "event-details-inner";

    const notes = document.createElement("p");
    notes.className = "event-notes";
    notes.textContent = event.notes || "No notes provided.";

    detailsInner.append(notes);
    details.append(detailsInner);
    card.append(button, details);
    item.append(marker, card);
    fragment.append(item);

    button.addEventListener("click", () => {
      if (state.expandedIds.has(event.id)) {
        state.expandedIds.delete(event.id);
      } else {
        state.expandedIds.add(event.id);
      }

      render();
    });
  });

  elements.list.replaceChildren(fragment);
  elements.emptyState.hidden = state.filteredEvents.length > 0;
  elements.expandToggle.textContent = state.allExpanded ? "Collapse all" : "Expand all";
  emitHeight();
}

function render() {
  applyFilters();
  renderTimeline();
}

function bindControls() {
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  elements.yearFilter.addEventListener("change", (event) => {
    state.year = event.target.value;
    state.expandedIds.clear();
    state.allExpanded = false;
    render();
  });

  elements.sortOrder.addEventListener("change", (event) => {
    state.sortOrder = event.target.value;
    render();
  });

  elements.keyEventsToggle.addEventListener("change", (event) => {
    state.keyEventsOnly = event.target.checked;
    state.expandedIds.clear();
    state.allExpanded = false;
    render();
  });

  elements.expandToggle.addEventListener("click", () => {
    state.allExpanded = !state.allExpanded;
    state.expandedIds = state.allExpanded
      ? new Set(state.filteredEvents.map((event) => event.id))
      : new Set();
    renderTimeline();
  });

  window.addEventListener("resize", emitHeight);
}

async function init() {
  bindControls();

  try {
    const response = await loadSheetResponse();
    state.events = parseSheetEvents(response)
      .map((event, index) => ({
        ...event,
        id: event.id || `event-${index + 1}`,
        isKeyEvent: Boolean(event.isKeyEvent),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    state.filteredEvents = [...state.events];
    updateStats();
    render();
  } catch (error) {
    elements.summary.textContent =
      "The timeline data could not be loaded. Confirm the Google Sheet is shared publicly and includes date and milestone columns.";
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = error.message;
    emitHeight();
  }
}

init();
