import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { resolveBBox } = require("../../../src/main/localization/resolve-mark.js");

describe("resolveBBox", () => {
  it("converts 0-1000 bbox to CSS pixels", () => {
    expect(
      resolveBBox(
        {
          action: "cursor",
          bbox: [100, 200, 300, 400],
          description: "Save button",
        },
        1920,
        1080,
      ),
    ).toEqual({
      action: "cursor",
      x: 576,
      y: 216,
      w: 384,
      h: 216,
      markBBox: { x: 384, y: 108, w: 384, h: 216 },
      description: "Save button",
      label: "Save button",
      isFinal: false,
      coarseMethod: "bbox",
    });
  });

  it("returns highlight boxes without centering", () => {
    const resolved = resolveBBox(
      {
        action: "highlight",
        bbox: [0, 0, 500, 500],
        description: "Panel",
      },
      1000,
      800,
    );

    expect(resolved).toMatchObject({
      action: "highlight",
      x: 0,
      y: 0,
      w: 500,
      h: 400,
      coarseMethod: "bbox",
    });
  });

  it("falls back to legacy coordinates when bbox is invalid", () => {
    expect(
      resolveBBox(
        {
          action: "cursor",
          x: 50,
          y: 75,
          description: "Legacy",
        },
        1920,
        1080,
      ),
    ).toMatchObject({
      x: 50,
      y: 75,
      coarseMethod: "legacy",
    });
  });

  it("clamps bbox to screen bounds", () => {
    const resolved = resolveBBox(
      {
        action: "cursor",
        bbox: [0, 900, 200, 1000],
        description: "Edge",
      },
      1000,
      800,
    );

    expect(resolved.x).toBeGreaterThanOrEqual(900);
    expect(resolved.y).toBe(80);
    expect(resolved.w).toBeLessThanOrEqual(100);
  });
});
