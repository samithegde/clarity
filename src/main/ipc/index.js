const { registerAiToolsIpc } = require("./ai-tools");
const { registerCaptureIpc } = require("./capture");
const { registerChatIpc } = require("./chat");
const { registerWhisperIpc } = require("./whisper");
const { registerWindowIpc } = require("./window");
const { registerDashboardIpc } = require("./dashboard");
const { registerElevenLabsIpc } = require("./elevenlabs");
const { registerRagIpc } = require("./rag");

function registerIpcHandlers(ipcMain) {
  registerAiToolsIpc(ipcMain);
  registerCaptureIpc(ipcMain);
  registerChatIpc(ipcMain);
  registerWhisperIpc(ipcMain);
  registerWindowIpc(ipcMain);
  registerDashboardIpc(ipcMain);
  registerElevenLabsIpc(ipcMain);
  registerRagIpc(ipcMain);
}

module.exports = { registerIpcHandlers };
