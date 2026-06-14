const fs = require("fs");
const path = require("path");

const MAX_BUFFER = 500;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const buffer = [];

function isEnabled() {
  return process.env.TELEMETRY_ENABLED !== "false";
}

function getLogPath() {
  return path.join(__dirname, "../../../data/telemetry/chat-events.jsonl");
}

function ensureLogDir() {
  const dir = path.dirname(getLogPath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createEventId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

function appendToFile(entry) {
  try {
    ensureLogDir();
    fs.appendFileSync(getLogPath(), `${JSON.stringify(entry)}\n`, "utf8");
  } catch (err) {
    console.warn("[Telemetry] Failed to persist event:", err.message);
  }
}

function recordChatEvent(event) {
  if (!isEnabled()) return null;

  const entry = {
    id: createEventId(),
    ts: new Date().toISOString(),
    ...event,
  };

  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) {
    buffer.shift();
  }

  appendToFile(entry);

  const status = entry.success ? "ok" : "fail";
  const model = entry.model || "unknown";
  const provider = entry.provider || "unknown";
  console.log(
    `[Telemetry] ${entry.event} ${status} ${entry.durationMs}ms provider=${provider} model=${model}`,
  );

  return entry;
}

function getRecentEvents({ limit = 20 } = {}) {
  const safeLimit = Math.max(1, Math.min(MAX_BUFFER, Number(limit) || 20));
  return buffer.slice(-safeLimit).reverse();
}

function summarizeBucket(events) {
  const durations = events
    .map((event) => Number(event.durationMs))
    .filter(Number.isFinite);
  const successes = events.filter((event) => event.success);
  const failures = events.filter((event) => !event.success);

  return {
    count: events.length,
    successCount: successes.length,
    errorCount: failures.length,
    avgMs: average(durations),
    p95Ms: percentile(durations, 95),
  };
}

function getSummary({ windowMs = DEFAULT_WINDOW_MS } = {}) {
  const safeWindow = Math.max(60_000, Number(windowMs) || DEFAULT_WINDOW_MS);
  const cutoff = Date.now() - safeWindow;
  const recent = buffer.filter(
    (event) => new Date(event.ts).getTime() >= cutoff,
  );

  const byEvent = recent.reduce((groups, event) => {
    const key = event.event || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
    return groups;
  }, {});

  const providers = {};
  for (const event of recent) {
    const key = event.provider || "unknown";
    providers[key] = (providers[key] || 0) + 1;
  }

  const models = {};
  for (const event of recent) {
    const key = event.model || "unknown";
    models[key] = (models[key] || 0) + 1;
  }

  return {
    enabled: isEnabled(),
    windowMs: safeWindow,
    totalEvents: recent.length,
    providers,
    models,
    chatSend: summarizeBucket(byEvent["chat.send"] || []),
    chatStep: summarizeBucket(byEvent["chat.step"] || []),
    recentErrors: recent
      .filter((event) => !event.success)
      .slice(-5)
      .map((event) => ({
        ts: event.ts,
        event: event.event,
        error: event.error || "Unknown error",
        model: event.model,
        provider: event.provider,
      })),
  };
}

function formatSummaryText(summary) {
  const lines = [
    `Telemetry ${summary.enabled ? "enabled" : "disabled"} (last ${Math.round(summary.windowMs / 60000)}m)`,
    `Events: ${summary.totalEvents}`,
    `chat.send: ${summary.chatSend.count} calls, ${summary.chatSend.successCount} ok, ${summary.chatSend.errorCount} errors, avg ${summary.chatSend.avgMs}ms, p95 ${summary.chatSend.p95Ms}ms`,
    `chat.step: ${summary.chatStep.count} calls, ${summary.chatStep.successCount} ok, ${summary.chatStep.errorCount} errors, avg ${summary.chatStep.avgMs}ms, p95 ${summary.chatStep.p95Ms}ms`,
  ];

  const providerEntries = Object.entries(summary.providers);
  if (providerEntries.length) {
    lines.push(
      `Providers: ${providerEntries.map(([name, count]) => `${name}=${count}`).join(", ")}`,
    );
  }

  const modelEntries = Object.entries(summary.models);
  if (modelEntries.length) {
    lines.push(
      `Models: ${modelEntries.map(([name, count]) => `${name}=${count}`).join(", ")}`,
    );
  }

  if (summary.recentErrors.length) {
    lines.push(
      `Recent errors: ${summary.recentErrors
        .map((entry) => `${entry.event} (${entry.error})`)
        .join(" | ")}`,
    );
  }

  return lines.join("\n");
}

module.exports = {
  recordChatEvent,
  getRecentEvents,
  getSummary,
  formatSummaryText,
  isEnabled,
};
