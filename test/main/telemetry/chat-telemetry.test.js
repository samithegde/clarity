import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  getSummary,
  recordChatEvent,
  isEnabled,
} = require("../../../src/main/telemetry/chat-telemetry.js");

describe("chat telemetry", () => {
  it("records send and step events with summary stats", () => {
    const previous = process.env.TELEMETRY_ENABLED;
    process.env.TELEMETRY_ENABLED = "true";

    try {
      recordChatEvent({
        event: "chat.send",
        success: true,
        provider: "ollama",
        model: "llama3.3",
        mode: "navigation",
        durationMs: 1200,
        meta: { planLength: 2, ragChunks: 1 },
      });
      recordChatEvent({
        event: "chat.send",
        success: false,
        provider: "ollama",
        model: "llama3.3",
        mode: "navigation",
        durationMs: 400,
        error: "model not found",
      });
      recordChatEvent({
        event: "chat.step",
        success: true,
        provider: "ollama",
        model: "llama3.3",
        mode: "navigation",
        durationMs: 800,
        meta: { planLength: 1, hasScreenshot: true },
      });

      const summary = getSummary({ windowMs: 60_000 });
      expect(isEnabled()).toBe(true);
      expect(summary.totalEvents).toBeGreaterThanOrEqual(3);
      expect(summary.chatSend.count).toBeGreaterThanOrEqual(2);
      expect(summary.chatSend.errorCount).toBeGreaterThanOrEqual(1);
      expect(summary.chatStep.count).toBeGreaterThanOrEqual(1);
      expect(summary.providers.ollama).toBeGreaterThanOrEqual(3);
    } finally {
      process.env.TELEMETRY_ENABLED = previous;
    }
  });
});
