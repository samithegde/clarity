import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  recordActivity,
  startSession,
  getRecentActivity,
  summarizePlan,
  isEnabled,
} = require("../../../src/main/telemetry/chat-activity-log.js");

describe("chat activity log", () => {
  it("records pipeline phases for a session", () => {
    const previous = process.env.CHAT_ACTIVITY_LOG;
    process.env.CHAT_ACTIVITY_LOG = "true";

    try {
      const sessionId = startSession({
        userText: "Where is the save button?",
        mode: "navigation",
        provider: "ollama",
      });

      recordActivity({
        sessionId,
        phase: "rag.intent",
        message: "Intent: find save button",
        detail: { ragQuery: "how to save document" },
      });

      recordActivity({
        sessionId,
        phase: "model.response",
        message: 'Click Save in the toolbar | 1 on-screen action(s): cursor "Save"',
        detail: {
          plan: summarizePlan([
            { action: "cursor", description: "Save", bbox: [100, 200, 150, 280] },
          ]),
        },
      });

      const entries = getRecentActivity({ sessionId, limit: 10 });
      expect(isEnabled()).toBe(true);
      expect(entries.length).toBeGreaterThanOrEqual(3);
      expect(entries.some((entry) => entry.phase === "rag.intent")).toBe(true);
      expect(entries.some((entry) => entry.phase === "model.response")).toBe(true);
    } finally {
      process.env.CHAT_ACTIVITY_LOG = previous;
    }
  });
});
