const {
  getRecentEvents,
  getSummary,
  isEnabled,
} = require("../telemetry/chat-telemetry");
const {
  isEnabled: isActivityEnabled,
  recordActivity,
  getRecentActivity,
  formatActivityText,
  startSession,
  summarizePlan,
} = require("../telemetry/chat-activity-log");

function registerTelemetryIpc(ipcMain) {
  ipcMain.handle("telemetry:chat:status", () => ({
    enabled: isEnabled(),
    activityLog: isActivityEnabled(),
  }));

  ipcMain.handle("telemetry:chat:summary", (_event, payload) =>
    getSummary({ windowMs: payload?.windowMs }),
  );

  ipcMain.handle("telemetry:chat:recent", (_event, payload) =>
    getRecentEvents({ limit: payload?.limit }),
  );

  ipcMain.handle("telemetry:chat:activity:recent", (_event, payload) =>
    getRecentActivity({
      sessionId: payload?.sessionId,
      limit: payload?.limit,
    }),
  );

  ipcMain.handle("telemetry:chat:activity:record", (_event, payload) =>
    recordActivity(payload),
  );
}

module.exports = {
  registerTelemetryIpc,
  startSession,
  recordActivity,
  summarizePlan,
  isActivityEnabled,
  formatActivityText,
  getRecentActivity,
};
