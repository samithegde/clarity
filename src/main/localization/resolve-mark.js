const { bboxPercentToCss } = require("../../shared/localization-coords");

function asFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function resolveLegacyStep(step) {
  const x = asFiniteNumber(step?.x);
  const y = asFiniteNumber(step?.y);
  if (x === null || y === null) return null;

  const w = asFiniteNumber(step?.w);
  const h = asFiniteNumber(step?.h);
  const description = String(step?.description ?? step?.label ?? "").trim();

  return {
    action: step.action,
    x: Math.round(x),
    y: Math.round(y),
    w: w === null ? null : Math.round(w),
    h: h === null ? null : Math.round(h),
    description,
    label: description,
    isFinal: Boolean(step?.isFinal),
    coarseMethod: "legacy",
  };
}

function resolveBBox(step, screenW, screenH) {
  const description = String(step?.description ?? step?.label ?? "").trim();
  const action = String(step?.action ?? "cursor").toLowerCase();
  const cssBox = bboxPercentToCss(step?.bbox, screenW, screenH);

  if (!cssBox) {
    return resolveLegacyStep(step);
  }

  const markBBox = { x: cssBox.x, y: cssBox.y, w: cssBox.w, h: cssBox.h };
  const centerX = Math.round(cssBox.x + cssBox.w / 2);
  const centerY = Math.round(cssBox.y + cssBox.h / 2);

  if (action === "highlight") {
    return {
      action,
      x: cssBox.x,
      y: cssBox.y,
      w: cssBox.w,
      h: cssBox.h,
      markBBox,
      description,
      label: description,
      isFinal: Boolean(step?.isFinal),
      coarseMethod: "bbox",
    };
  }

  return {
    action,
    x: centerX,
    y: centerY,
    w: cssBox.w,
    h: cssBox.h,
    markBBox,
    description,
    label: description,
    isFinal: Boolean(step?.isFinal),
    coarseMethod: "bbox",
  };
}

module.exports = {
  resolveBBox,
  resolveLegacyStep,
};
