const { embed } = require("./embedder");
const { search } = require("./store");

async function retrieve(query, { topK, collection } = {}) {
  const k = topK ?? (Number(process.env.RAG_TOP_K) || 5);
  const queryEmbedding = await embed(query);
  return search(queryEmbedding, { topK: k, collection });
}

module.exports = { retrieve };
