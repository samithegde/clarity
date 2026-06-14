import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  chat,
  planRetrieval,
} = require("../../../src/main/ollama/service.js");

describe("ollama json parsing", () => {
  it("parses fenced and embedded JSON from model text", async () => {
    const originalFetch = global.fetch;
    const payloads = [
      'Here is the answer:\n```json\n{"explanation":"Hello","plan":[]}\n```',
      '{"explanation":"Hi","plan":[{"action":"cursor","description":"Save","bbox":[1,2,3,4]}]}',
    ];

    let call = 0;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        message: { content: payloads[call++] },
      }),
    });

    try {
      const result = await chat(
        [{ sender: "user", text: "hello" }],
        { mode: "navigation" },
      );
      expect(result.explanation).toBe("Hello");
      expect(result.plan).toEqual([]);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("falls back when plan retrieval JSON is malformed", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        message: { content: "not json at all" },
      }),
    });

    try {
      const plan = await planRetrieval("open settings", [], { mode: "navigation" });
      expect(plan.intent).toBe("open settings");
      expect(plan.ragQuery).toBe("open settings");
      expect(plan.needsOnScreenGuidance).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
