const path = require("path");
const { ingestDocs } = require("../rag/ingest");
const { getStats } = require("../rag/store");

function registerRagIpc(ipcMain) {
  ipcMain.handle("rag:status", async () => {
    return getStats();
  });

  ipcMain.handle("rag:ingest", async (_event, payload) => {
    const docsPath =
      payload?.docsPath ||
      process.env.RAG_DOCS_PATH ||
      path.join(process.cwd(), "docs");
    return ingestDocs(docsPath);
  });
}

module.exports = { registerRagIpc };
