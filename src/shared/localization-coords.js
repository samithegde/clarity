function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseBboxArray(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
  const nums = bbox.map((value) => Math.round(Number(value)));
  if (!nums.every(Number.isFinite)) return null;
  const [ymin, xmin, ymax, xmax] = nums;
  if (ymax <= ymin || xmax <= xmin) return null;
  return nums;
}

function bboxPercentToCss(bbox, screenW, screenH) {
  const parsed = parseBboxArray(bbox);
  if (!parsed) return null;

  const [ymin, xmin, ymax, xmax] = parsed;
  const width = Math.max(1, Math.round(Number(screenW)));
  const height = Math.max(1, Math.round(Number(screenH)));

  const x = Math.round((xmin / 1000) * width);
  const y = Math.round((ymin / 1000) * height);
  const w = Math.round(((xmax - xmin) / 1000) * width);
  const h = Math.round(((ymax - ymin) / 1000) * height);

  if (w <= 0 || h <= 0) return null;

  return {
    x: clamp(x, 0, width - 1),
    y: clamp(y, 0, height - 1),
    w: clamp(w, 1, width - x),
    h: clamp(h, 1, height - y),
  };
}

function mapCropPointToScreen(point, crop, step = {}) {
  const localX = Number(point?.x);
  const localY = Number(point?.y);
  if (!Number.isFinite(localX) || !Number.isFinite(localY)) return null;

  const dpr = Number(crop?.dpr) || 1;
  const scaleX = Number(crop?.scaleX) || 1;
  const scaleY = Number(crop?.scaleY) || 1;
  const x1 = Number(crop?.x1) || 0;
  const y1 = Number(crop?.y1) || 0;

  const refinedX = Math.round((x1 + localX) / (dpr * scaleX));
  const refinedY = Math.round((y1 + localY) / (dpr * scaleY));

  if (step.action === "highlight") {
    return {
      ...step,
      x: Math.round(refinedX - (step.w || 0) / 2),
      y: Math.round(refinedY - (step.h || 0) / 2),
    };
  }

  return { ...step, x: refinedX, y: refinedY };
}

function mapBBoxCenterToScreen(step) {
  const box = step?.markBBox;
  if (!box) return step;

  const centerX = Math.round(Number(box.x) + Number(box.w) / 2);
  const centerY = Math.round(Number(box.y) + Number(box.h) / 2);

  if (step.action === "highlight") {
    return {
      ...step,
      x: Math.round(Number(box.x)),
      y: Math.round(Number(box.y)),
    };
  }

  return { ...step, x: centerX, y: centerY };
}

module.exports = {
  parseBboxArray,
  bboxPercentToCss,
  mapCropPointToScreen,
  mapBBoxCenterToScreen,
};
