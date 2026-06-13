import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { normalizePlanItem } = require("../../../src/main/gemini/service.js");

describe("normalizePlanItem", () => {
  it("accepts cursor plan items with bbox", () => {
    expect(
      normalizePlanItem({
        action: "cursor",
        bbox: [100, 200, 300, 400],
        description: "Click Save",
      }),
    ).toEqual({
      action: "cursor",
      bbox: [100, 200, 300, 400],
      label: "Click Save",
      description: "Click Save",
      isFinal: false,
    });
  });

  it("accepts highlight plan items with bbox", () => {
    expect(
      normalizePlanItem({
        action: "highlight",
        bbox: [50, 60, 150, 260],
        description: "Menu bar",
        isFinal: true,
      }),
    ).toEqual({
      action: "highlight",
      bbox: [50, 60, 150, 260],
      label: "Menu bar",
      description: "Menu bar",
      isFinal: true,
    });
  });

  it("rejects malformed bbox arrays", () => {
    expect(
      normalizePlanItem({
        action: "cursor",
        bbox: [100, 200, 150],
        description: "Broken",
      }),
    ).toBeNull();

    expect(
      normalizePlanItem({
        action: "cursor",
        bbox: [300, 200, 100, 400],
        description: "Inverted",
      }),
    ).toBeNull();
  });

  it("falls back to legacy x/y coordinates", () => {
    expect(
      normalizePlanItem({
        action: "cursor",
        x: 120,
        y: 340,
        description: "Legacy point",
      }),
    ).toEqual({
      action: "cursor",
      x: 120,
      y: 340,
      label: "Legacy point",
      description: "Legacy point",
      isFinal: false,
    });
  });

  it("requires description and valid action", () => {
    expect(
      normalizePlanItem({
        action: "cursor",
        bbox: [10, 20, 30, 40],
      }),
    ).toBeNull();

    expect(
      normalizePlanItem({
        action: "zoom",
        bbox: [10, 20, 30, 40],
        description: "Nope",
      }),
    ).toBeNull();
  });
});
