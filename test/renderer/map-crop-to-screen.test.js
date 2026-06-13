import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  mapCropPointToScreen,
  mapBBoxCenterToScreen,
} = require("../../src/shared/localization-coords.js");

describe("mapCropPointToScreen", () => {
  const crop = {
    x1: 100,
    y1: 50,
    dpr: 2,
    scaleX: 1,
    scaleY: 1,
  };

  it("maps crop-local pixels to CSS screen coordinates for cursor steps", () => {
    expect(
      mapCropPointToScreen({ x: 40, y: 60 }, crop, {
        action: "cursor",
      }),
    ).toEqual({
      action: "cursor",
      x: 70,
      y: 55,
    });
  });

  it("offsets highlight boxes from refined center", () => {
    expect(
      mapCropPointToScreen({ x: 100, y: 100 }, crop, {
        action: "highlight",
        w: 40,
        h: 20,
      }),
    ).toEqual({
      action: "highlight",
      w: 40,
      h: 20,
      x: 80,
      y: 65,
    });
  });
});

describe("mapBBoxCenterToScreen", () => {
  it("returns bbox center for cursor actions", () => {
    expect(
      mapBBoxCenterToScreen({
        action: "cursor",
        markBBox: { x: 100, y: 200, w: 40, h: 20 },
      }),
    ).toEqual({
      action: "cursor",
      markBBox: { x: 100, y: 200, w: 40, h: 20 },
      x: 120,
      y: 210,
    });
  });

  it("keeps top-left for highlight actions", () => {
    expect(
      mapBBoxCenterToScreen({
        action: "highlight",
        markBBox: { x: 10, y: 20, w: 100, h: 50 },
      }),
    ).toEqual({
      action: "highlight",
      markBBox: { x: 10, y: 20, w: 100, h: 50 },
      x: 10,
      y: 20,
    });
  });
});
