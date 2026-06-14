const jsonStore = require("./store-json");
const lanceStore = require("./store-lance");

function getStoreKind() {
  const kind = process.env.RAG_STORE?.trim().toLowerCase();
  if (kind === "json") return "json";
  return "lance";
}

function getStore() {
  return getStoreKind() === "json" ? jsonStore : lanceStore;
}

function upsertChunks(chunks) {
  return getStore().upsertChunks(chunks);
}

function search(queryEmbedding, options) {
  return getStore().search(queryEmbedding, options);
}

function getStats() {
  return Promise.resolve(getStore().getStats());
}

function close() {
  return getStore().close();
}

module.exports = {
  upsertChunks,
  search,
  getStats,
  close,
  getStoreKind,
  jsonStore,
  lanceStore,
};
