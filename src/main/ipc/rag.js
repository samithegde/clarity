const { retrieve, getProviderStatus } = require("../rag/retrieve");

function registerRagIpc(ipcMain) {
  ipcMain.handle("rag:status", async () => {
    return getProviderStatus();
  });

  ipcMain.handle("rag:search", async (_event, payload) => {
    const query = String(payload?.query || "").trim();
    if (!query) {
      throw new Error("query is required.");
    }

    const retrievalSource =
      payload?.retrievalSource === "context7" ? "context7" : "web";

    return retrieve({
      requiresRag: true,
      query,
      ragQuery: query,
      retrievalSource,
      libraryName: payload?.libraryName,
    });
  });
}

module.exports = { registerRagIpc };
