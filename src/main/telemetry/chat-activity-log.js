const fs = require("fs");
const path = require("path");
const { getChatWindow } = require("../window");

const MAX_BUFFER = 1000;
const buffer = [];
const sessions = new Map();

function isEnabled() {
  const raw = process.env.CHAT_ACTIVITY_LOG?.trim();
  if (raw !== undefined && raw !== "") {
    const normalized = raw.toLowerCase();
    return normalized !== "false" && normalized !== "0" && normalized !== "no";
  }
  return process.env.TELEMETRY_ENABLED !== "false";
}

function getLogPath() {
  return path.join(__dirname, "../../../data/telemetry/chat-activity.jsonl");
}

function ensureLogDir() {
  const dir = path.dirname(getLogPath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function truncate(text, max = 240) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function summarizePlan(plan) {
  if (!Array.isArray(plan) || !plan.length) return [];

  return plan.slice(0, 8).map((item, index) => ({
    step: index + 1,
    action: item?.action || "cursor",
    description: truncate(item?.description || item?.label || "", 120),
    bbox: Array.isArray(item?.bbox) ? item.bbox : undefined,
    isFinal: Boolean(item?.isFinal),
  }));
}

function broadcastActivity(entry) {
  const win = getChatWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send("telemetry:chat:activity", entry);
}

function appendToFile(entry) {
  try {
    ensureLogDir();
    fs.appendFileSync(getLogPath(), `${JSON.stringify(entry)}\n`, "utf8");
  } catch (err) {
    console.warn("[ChatActivity] Failed to persist entry:", err.message);
  }
}

function recordActivity({
  sessionId,
  phase,
  message,
  level = "info",
  detail = null,
} = {}) {
  if (!isEnabled()) return null;

  const entry = {
    id: createId("act"),
    ts: new Date().toISOString(),
    sessionId: sessionId || null,
    phase: phase || "system",
    level,
    message: truncate(message, 500),
    detail,
  };

  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) {
    buffer.shift();
  }

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    session.entries.push(entry.id);
    session.lastPhase = entry.phase;
    session.updatedAt = entry.ts;
  }

  appendToFile(entry);
  broadcastActivity(entry);

  console.log(`[ChatActivity] [${entry.phase}] ${entry.message}`);

  return entry;
}

function startSession({ userText, mode, provider } = {}) {
  const sessionId = createId("sess");
  const session = {
    id: sessionId,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: mode || "navigation",
    provider: provider || null,
    userText: truncate(userText, 300),
    entries: [],
    lastPhase: "session.start",
  };

  sessions.set(sessionId, session);
  if (sessions.size > 100) {
    const oldest = sessions.keys().next().value;
    sessions.delete(oldest);
  }

  recordActivity({
    sessionId,
    phase: "session.start",
    message: `New request (${session.mode}): ${truncate(userText, 180) || "(attachments only)"}`,
    detail: { mode: session.mode, provider: session.provider },
  });

  return sessionId;
}

function getRecentActivity({ sessionId, limit = 40 } = {}) {
  const safeLimit = Math.max(1, Math.min(MAX_BUFFER, Number(limit) || 40));
  let entries = buffer;

  if (sessionId) {
    entries = buffer.filter((entry) => entry.sessionId === sessionId);
  }

  return entries.slice(-safeLimit).reverse();
}

function formatActivityText(entries) {
  if (!entries.length) return "No activity logged yet.";

  return entries
    .slice()
    .reverse()
    .map((entry) => {
      const time = new Date(entry.ts).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
      return `${time} [${entry.phase}] ${entry.message}`;
    })
    .join("\n");
}

module.exports = {
  isEnabled,
  startSession,
  recordActivity,
  getRecentActivity,
  formatActivityText,
  summarizePlan,
  truncate,
};
