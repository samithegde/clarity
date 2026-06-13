const { sendToRenderer, sendOverlayPointAction } = require("../window");

function registerAiToolsIpc(ipcMain) {
  ipcMain.handle("ai-tools:cursor-move", (_event, payload) => {
    sendOverlayPointAction("ai:cursor:move", payload);
    return { ok: true };
  });

  ipcMain.handle("ai-tools:cursor-set-visible", (_event, visible) => {
    sendToRenderer("ai:cursor:visibility", { visible: Boolean(visible) });
    return { ok: true };
  });

  ipcMain.handle("ai-tools:highlighter-rect", (_event, payload) => {
    sendOverlayPointAction("ai:highlighter:rect", payload);
    return { ok: true };
  });

  ipcMain.handle("ai-tools:highlighter-circle", (_event, payload) => {
    sendOverlayPointAction("ai:highlighter:circle", payload);
    return { ok: true };
  });

  ipcMain.handle("ai-tools:highlighter-stroke", (_event, payload) => {
    sendOverlayPointAction("ai:highlighter:stroke", payload);
    return { ok: true };
  });

  ipcMain.handle("ai-tools:highlighter-clear", () => {
    sendToRenderer("ai:highlighter:clear");
    return { ok: true };
  });
}

module.exports = { registerAiToolsIpc };
