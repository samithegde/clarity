const { discoverMarks } = require("../ui-automation/mark-discovery");
const { getOcrCandidates } = require("../localization/ocr-boxes");
const { refineWithMoondreamPoint } = require("../localization/moondream-point-refine");
const { refineWithMoondreamDetect } = require("../localization/moondream-detect-refine");

function isSomEnabled() {
  return process.env.SOM_ENABLED !== "false";
}

function registerLocalizationIpc(ipcMain) {
  ipcMain.handle("localization:som-enabled", () => isSomEnabled());

  ipcMain.handle("ui-marks:discover", async () => {
    if (!isSomEnabled()) {
      return { marks: [], displayBounds: null, enabled: false };
    }

    return {
      ...(await discoverMarks()),
      enabled: true,
    };
  });

  ipcMain.handle("localization:ocr-crop", async (_event, payload) => {
    const { croppedBase64, targetText } = payload ?? {};
    if (!croppedBase64) {
      return { candidates: [], fastPath: null };
    }

    return getOcrCandidates({ croppedBase64, targetText });
  });

  ipcMain.handle("localization:moondream-point", async (_event, payload) => {
    const { croppedBase64, cropW, cropH, targetElement } = payload ?? {};

    if (!croppedBase64) {
      return null;
    }

    try {
      return await refineWithMoondreamPoint({
        croppedBase64,
        cropW,
        cropH,
        targetElement,
      });
    } catch (error) {
      const message = error?.message || String(error);
      if (message.includes("unavailable") || message.includes("apiKey")) {
        console.warn("[localization] Moondream point skipped:", message);
      } else {
        console.warn("[localization] Moondream point failed:", message);
      }
      return null;
    }
  });

  ipcMain.handle("localization:moondream-detect", async (_event, payload) => {
    const { croppedBase64, cropW, cropH, targetElement } = payload ?? {};

    if (!croppedBase64) {
      return null;
    }

    try {
      return await refineWithMoondreamDetect({
        croppedBase64,
        cropW,
        cropH,
        targetElement,
      });
    } catch (error) {
      const message = error?.message || String(error);
      if (message.includes("unavailable") || message.includes("apiKey")) {
        console.warn("[localization] Moondream detect skipped:", message);
      } else {
        console.warn("[localization] Moondream detect failed:", message);
      }
      return null;
    }
  });
}

module.exports = {
  registerLocalizationIpc,
  isSomEnabled,
};
