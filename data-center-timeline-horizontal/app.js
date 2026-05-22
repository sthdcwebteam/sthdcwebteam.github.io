const DATA_URL = new URL("./data/timeline.json", window.location.href);

const state = {
  events: [],
  filteredEvents: [],
  search: "",
  year: "all",
  sortOrder: "asc",
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
      const matchesSearch =
        !search ||
        normalizeText(event.milestone).includes(search) ||
        normalizeText(event.notes).includes(search);

      return matchesYear && matchesSearch;
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

function renderTimeline() {
  const fragment = document.createDocumentFragment();

  state.filteredEvents.forEach((event) => {
    const isOpen = state.expandedIds.has(event.id);
    const item = document.createElement("li");
    item.className = "timeline-item";

    const marker = document.createElement("span");
    marker.className = "timeline-marker";
    marker.setAttribute("aria-hidden", "true");

    const card = document.createElement("article");
    card.className = `event-card${isOpen ? " is-open" : ""}`;

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
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load ${DATA_URL.pathname}`);
    }

    const payload = await response.json();
    state.events = payload.events
      .map((event, index) => ({
        ...event,
        id: event.id || `event-${index + 1}`,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    state.filteredEvents = [...state.events];
    updateStats();
    render();
  } catch (error) {
    elements.summary.textContent =
      "The timeline data could not be loaded. Confirm data/timeline.json is published beside this page.";
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = error.message;
    emitHeight();
  }
}

init();
