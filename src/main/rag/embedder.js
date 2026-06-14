const geminiEmbedder = require("./embedder-gemini");
const localEmbedder = require("./embedder-local");

function getEmbedderKind() {
  const kind = process.env.RAG_EMBEDDER?.trim().toLowerCase();
  if (kind === "gemini") return "gemini";
  return "local";
}

function getEmbedder() {
  return getEmbedderKind() === "gemini" ? geminiEmbedder : localEmbedder;
}

async function embed(text) {
  return getEmbedder().embed(text);
}

async function embedBatch(texts) {
  return getEmbedder().embedBatch(texts);
}

module.exports = { embed, embedBatch, getEmbedderKind };
