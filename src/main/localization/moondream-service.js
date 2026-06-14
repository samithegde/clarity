const DEFAULT_ENDPOINT = "http://localhost:2020/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const PROBE_TIMEOUT_MS = 2_000;

let clientPromise = null;
let resolvedMode = null;

function isMoondreamEnabled() {
  return process.env.MOONDREAM_ENABLED !== "false";
}

function getMoondreamEndpoint() {
  return (process.env.MOONDREAM_ENDPOINT || DEFAULT_ENDPOINT).replace(/\/$/, "");
}

function getMoondreamApiKey() {
  return process.env.MOONDREAM_API_KEY?.trim() || null;
}

function getMoondreamTimeoutMs() {
  const value = Number(process.env.MOONDREAM_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function decodeBase64Image(base64) {
  const clean = String(base64 ?? "").trim();
  const comma = clean.indexOf(",");
  const data = comma >= 0 ? clean.slice(comma + 1) : clean;
  return Buffer.from(data, "base64");
}

function scalePointToPixels(point, cropW, cropH) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const width = Math.max(1, Math.round(Number(cropW)));
  const height = Math.max(1, Math.round(Number(cropH)));

  if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
    return {
      x: Math.round(x * width),
      y: Math.round(y * height),
    };
  }

  return { x: Math.round(x), y: Math.round(y) };
}

function selectMoondreamBackend({ enabled, endpointReachable, endpoint, apiKey }) {
  if (!enabled) {
    return { mode: "disabled", config: null };
  }
  if (endpointReachable) {
    return { mode: "local", config: { endpoint, apiKey: "" } };
  }
  if (apiKey) {
    return { mode: "cloud", config: { apiKey } };
  }
  return { mode: "unavailable", config: null };
}

function mapPointResponse(points, cropW, cropH, backend) {
  const point = Array.isArray(points) ? points[0] : null;
  const pixels = scalePointToPixels(point, cropW, cropH);
  if (!pixels) {
    return null;
  }

  return {
    x: pixels.x,
    y: pixels.y,
    method: "moondream-point",
    backend,
  };
}

async function probeLocalEndpoint(endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function resolveMoondreamClient() {
  if (!isMoondreamEnabled()) {
    resolvedMode = "disabled";
    return null;
  }

  const { vl } = require("moondream");
  const endpoint = getMoondreamEndpoint();
  const selection = selectMoondreamBackend({
    enabled: true,
    endpointReachable: await probeLocalEndpoint(endpoint),
    endpoint,
    apiKey: getMoondreamApiKey(),
  });

  resolvedMode = selection.mode;
  if (!selection.config) {
    return null;
  }

  return new vl(selection.config);
}

async function getMoondreamClient() {
  if (!clientPromise) {
    clientPromise = resolveMoondreamClient();
  }
  return clientPromise;
}

function getResolvedMode() {
  return resolvedMode;
}

function resetMoondreamClient() {
  clientPromise = null;
  resolvedMode = null;
}

async function logMoondreamStartupStatus() {
  if (!isMoondreamEnabled()) {
    console.info("[localization] Moondream disabled (MOONDREAM_ENABLED=false)");
    return;
  }

  await getMoondreamClient();
  if (resolvedMode === "local") {
    console.info(`[localization] Moondream using local endpoint (${getMoondreamEndpoint()})`);
    return;
  }
  if (resolvedMode === "cloud") {
    console.info("[localization] Moondream using Cloud API");
    return;
  }

  console.info(
    "[localization] Moondream unavailable (start Moondream Station or set MOONDREAM_API_KEY)",
  );
}

function scaleBboxToPixels(object, cropW, cropH) {
  if (!object || typeof object !== "object") return null;

  const width = Math.max(1, Math.round(Number(cropW)));
  const height = Math.max(1, Math.round(Number(cropH)));

  const xminRaw = object.x_min ?? object.xmin ?? object.xMin ?? object.left;
  const yminRaw = object.y_min ?? object.ymin ?? object.yMin ?? object.top;
  const xmaxRaw = object.x_max ?? object.xmax ?? object.xMax ?? object.right;
  const ymaxRaw = object.y_max ?? object.ymax ?? object.yMax ?? object.bottom;

  if (
    [xminRaw, yminRaw, xmaxRaw, ymaxRaw].every((value) => Number.isFinite(Number(value)))
  ) {
    let xmin = Number(xminRaw);
    let ymin = Number(yminRaw);
    let xmax = Number(xmaxRaw);
    let ymax = Number(ymaxRaw);

    if (xmax <= 1 && ymax <= 1 && xmin >= 0 && ymin >= 0) {
      xmin *= width;
      xmax *= width;
      ymin *= height;
      ymax *= height;
    }

    const w = Math.max(1, Math.round(xmax - xmin));
    const h = Math.max(1, Math.round(ymax - ymin));
    return {
      x: Math.round(xmin),
      y: Math.round(ymin),
      w,
      h,
    };
  }

  const x = Number(object.x);
  const y = Number(object.y);
  const w = Number(object.w ?? object.width);
  const h = Number(object.h ?? object.height);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
    return null;
  }

  if (x >= 0 && x <= 1 && y >= 0 && y <= 1 && w <= 1 && h <= 1) {
    return {
      x: Math.round(x * width),
      y: Math.round(y * height),
      w: Math.max(1, Math.round(w * width)),
      h: Math.max(1, Math.round(h * height)),
    };
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.max(1, Math.round(w)),
    h: Math.max(1, Math.round(h)),
  };
}

function mapDetectResponse(objects, cropW, cropH, backend) {
  const object = Array.isArray(objects) ? objects[0] : null;
  const pixels = scaleBboxToPixels(object, cropW, cropH);
  if (!pixels) {
    return null;
  }

  return {
    ...pixels,
    method: "moondream-detect",
    backend,
  };
}

async function detectTarget({
  imageBase64,
  cropW,
  cropH,
  targetElement,
} = {}) {
  if (!imageBase64) {
    return null;
  }

  const client = await getMoondreamClient();
  if (!client || typeof client.detect !== "function") {
    return null;
  }

  const object = String(targetElement ?? "").trim() || "target element";
  const image = decodeBase64Image(imageBase64);

  const result = await client.detect({
    image,
    object,
  });

  return mapDetectResponse(result?.objects, cropW, cropH, resolvedMode);
}

async function pointTarget({
  imageBase64,
  cropW,
  cropH,
  targetElement,
} = {}) {
  if (!imageBase64) {
    return null;
  }

  const client = await getMoondreamClient();
  if (!client) {
    return null;
  }

  const object = String(targetElement ?? "").trim() || "target element";
  const image = decodeBase64Image(imageBase64);

  const result = await client.point({
    image,
    object,
  });

  return mapPointResponse(result?.points, cropW, cropH, resolvedMode);
}

module.exports = {
  pointTarget,
  detectTarget,
  decodeBase64Image,
  scalePointToPixels,
  scaleBboxToPixels,
  selectMoondreamBackend,
  mapPointResponse,
  mapDetectResponse,
  isMoondreamEnabled,
  getResolvedMode,
  resetMoondreamClient,
  logMoondreamStartupStatus,
  getMoondreamEndpoint,
  getMoondreamApiKey,
  resolveMoondreamClient,
};
