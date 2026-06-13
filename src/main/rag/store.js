const fs = require("fs");
const path = require("path");

const INDEX_PATH = path.join(process.cwd(), "data", "rag-index.json");

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function loadIndex() {
  try {
    if (!fs.existsSync(INDEX_PATH)) return { chunks: [] };
    return JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  } catch {
    return { chunks: [] };
  }
}

function saveIndex(index) {
  const dir = path.dirname(INDEX_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index), "utf8");
}

function upsertChunks(chunks) {
  const index = loadIndex();
  for (const chunk of chunks) {
    const existing = index.chunks.findIndex((c) => c.id === chunk.id);
    if (existing !== -1) {
      index.chunks[existing] = chunk;
    } else {
      index.chunks.push(chunk);
    }
  }
  saveIndex(index);
}

function search(queryEmbedding, { topK = 5, collection } = {}) {
  const index = loadIndex();
  let chunks = index.chunks;

  if (collection) {
    chunks = chunks.filter((c) => c.collection === collection);
  }

  return chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ embedding: _embedding, ...rest }) => rest);
}

function getStats() {
  const index = loadIndex();
  const collections = [
    ...new Set(index.chunks.map((c) => c.collection).filter(Boolean)),
  ];
  return { totalChunks: index.chunks.length, collections };
}

module.exports = { upsertChunks, search, getStats, INDEX_PATH };
