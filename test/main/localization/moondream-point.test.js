import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  scalePointToPixels,
  decodeBase64Image,
  selectMoondreamBackend,
  mapPointResponse,
} = require("../../../src/main/localization/moondream-service.js");

describe("scalePointToPixels", () => {
  it("maps normalized coordinates to crop pixels", () => {
    expect(scalePointToPixels({ x: 0.5, y: 0.25 }, 200, 100)).toEqual({
      x: 100,
      y: 25,
    });
  });

  it("keeps pixel coordinates when values are outside 0-1", () => {
    expect(scalePointToPixels({ x: 42, y: 18 }, 200, 100)).toEqual({
      x: 42,
      y: 18,
    });
  });

  it("returns null for invalid points", () => {
    expect(scalePointToPixels(null, 200, 100)).toBeNull();
    expect(scalePointToPixels({ x: "bad", y: 1 }, 200, 100)).toBeNull();
  });
});

describe("decodeBase64Image", () => {
  it("strips data URL prefixes before decoding", () => {
    const encoded = Buffer.from("hello").toString("base64");
    expect(decodeBase64Image(`data:image/jpeg;base64,${encoded}`).toString()).toBe(
      "hello",
    );
  });
});

describe("selectMoondreamBackend", () => {
  it("prefers local endpoint when reachable", () => {
    expect(
      selectMoondreamBackend({
        enabled: true,
        endpointReachable: true,
        endpoint: "http://localhost:2020/v1",
        apiKey: null,
      }),
    ).toEqual({
      mode: "local",
      config: { endpoint: "http://localhost:2020/v1", apiKey: "" },
    });
  });

  it("falls back to cloud when local is unreachable and API key exists", () => {
    expect(
      selectMoondreamBackend({
        enabled: true,
        endpointReachable: false,
        endpoint: "http://localhost:2020/v1",
        apiKey: "test-key",
      }),
    ).toEqual({
      mode: "cloud",
      config: { apiKey: "test-key" },
    });
  });

  it("returns disabled when feature is off", () => {
    expect(
      selectMoondreamBackend({
        enabled: false,
        endpointReachable: true,
        endpoint: "http://localhost:2020/v1",
        apiKey: "test-key",
      }),
    ).toEqual({ mode: "disabled", config: null });
  });

  it("returns unavailable when no backend can be used", () => {
    expect(
      selectMoondreamBackend({
        enabled: true,
        endpointReachable: false,
        endpoint: "http://localhost:2020/v1",
        apiKey: null,
      }),
    ).toEqual({ mode: "unavailable", config: null });
  });
});

describe("mapPointResponse", () => {
  it("returns mapped crop coordinates from the first point", () => {
    expect(mapPointResponse([{ x: 0.4, y: 0.6 }], 250, 120, "cloud")).toEqual({
      x: 100,
      y: 72,
      method: "moondream-point",
      backend: "cloud",
    });
  });

  it("returns null when Moondream returns no points", () => {
    expect(mapPointResponse([], 250, 120, "cloud")).toBeNull();
  });
});
