let currentSessionId = null;
let panelOpen = false;

const PHASE_LABELS = {
  "session.start": "Start",
  "rag.intent": "Intent",
  "rag.retrieve": "RAG",
  "model.request": "Model",
  "model.response": "Response",
  "model.step": "Step",
  localization: "Locate",
  action: "Action",
  tts: "Speech",
  error: "Error",
  system: "System",
};

function formatEntryTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRawOutput(raw) {
  if (!raw) return "";
  const text = String(raw);
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function renderDetailBlock(detail, { excludeRaw = false } = {}) {
  const payload = { ...detail };
  if (excludeRaw) delete payload.raw;
  if (!Object.keys(payload).length) return null;

  const block = document.createElement("pre");
  block.className = "activity-log-detail";
  block.textContent = JSON.stringify(payload, null, 2);
  return block;
}

function renderActivityEntry(entry) {
  const item = document.createElement("div");
  item.className = `activity-log-entry activity-log-entry--${entry.level || "info"}`;
  if (entry.detail?.raw) {
    item.classList.add("activity-log-entry--has-raw");
  }
  item.dataset.entryId = entry.id;

  const phase = document.createElement("span");
  phase.className = "activity-log-phase";
  phase.textContent = PHASE_LABELS[entry.phase] || entry.phase;

  const time = document.createElement("span");
  time.className = "activity-log-time";
  time.textContent = formatEntryTime(entry.ts);

  const meta = document.createElement("div");
  meta.className = "activity-log-meta";
  meta.append(phase, time);
  item.append(meta);

  const raw = entry.detail?.raw;
  if (raw) {
    const message = document.createElement("p");
    message.className = "activity-log-message activity-log-message--summary";
    message.textContent = entry.message;

    const rawLabel = document.createElement("span");
    rawLabel.className = "activity-log-raw-label";
    rawLabel.textContent = "Raw model output";

    const rawBlock = document.createElement("pre");
    rawBlock.className = "activity-log-raw";
    rawBlock.textContent = formatRawOutput(raw);

    item.append(message, rawLabel, rawBlock);

    const detailBlock = renderDetailBlock(entry.detail, { excludeRaw: true });
    if (detailBlock) item.append(detailBlock);
    return item;
  }

  const message = document.createElement("p");
  message.className = "activity-log-message";
  message.textContent = entry.message;
  item.append(message);

  if (entry.detail && Object.keys(entry.detail).length) {
    const detailBlock = renderDetailBlock(entry.detail);
    if (detailBlock) item.append(detailBlock);
  }

  return item;
}

export function setActivitySessionId(sessionId) {
  currentSessionId = sessionId || null;
}

export function getActivitySessionId() {
  return currentSessionId;
}

export async function logChatActivity({ phase, message, level = "info", detail = null }) {
  if (!window.chatTelemetry?.recordActivity) return null;

  return window.chatTelemetry.recordActivity({
    sessionId: currentSessionId,
    phase,
    message,
    level,
    detail,
  });
}

export function appendActivityEntry(entry) {
  const list = document.getElementById("activity-log-list");
  if (!list || !entry) return;

  const node = renderActivityEntry(entry);
  list.prepend(node);

  while (list.children.length > 80) {
    list.lastElementChild?.remove();
  }

  const panel = document.getElementById("activity-log-panel");
  if (panel && !panelOpen && entry.level === "error") {
    panel.classList.remove("hidden");
    panelOpen = true;
    document.getElementById("activity-log-toggle")?.setAttribute("aria-pressed", "true");
  }

  list.scrollTop = 0;
}

export function clearActivityLog() {
  const list = document.getElementById("activity-log-list");
  if (list) list.innerHTML = "";
}

export function initActivityLogPanel() {
  const toggle = document.getElementById("activity-log-toggle");
  const panel = document.getElementById("activity-log-panel");
  const clearButton = document.getElementById("activity-log-clear");
  const list = document.getElementById("activity-log-list");

  if (!toggle || !panel || !list) return;

  toggle.addEventListener("click", () => {
    panelOpen = !panelOpen;
    panel.classList.toggle("hidden", !panelOpen);
    toggle.setAttribute("aria-pressed", String(panelOpen));
  });

  clearButton?.addEventListener("click", () => {
    clearActivityLog();
  });

  window.chatTelemetry?.onActivity?.((entry) => {
    appendActivityEntry(entry);
  });

  void window.chatTelemetry?.activityRecent?.({ limit: 30 }).then((entries) => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries.slice().reverse()) {
      appendActivityEntry(entry);
    }
  });
}
