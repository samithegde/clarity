const fs = require("fs");
const path = require("path");
const { embedBatch } = require("./embedder");
const { upsertChunks } = require("./store");

const CHUNK_WORDS = 500;
const CHUNK_OVERLAP = 80;
const EMBED_BATCH_SIZE = 20;

function chunkText(text) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_WORDS, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start += CHUNK_WORDS - CHUNK_OVERLAP;
  }

  return chunks;
}

function deriveCollection(filePath, docsRoot) {
  const relative = path.relative(docsRoot, filePath);
  const parts = relative.split(path.sep);
  return parts.length > 1 ? parts[0] : "general";
}

function walkDir(dir, extensions = [".md", ".txt"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, extensions));
    } else if (extensions.includes(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

async function ingestDocs(docsPath, { onProgress } = {}) {
  const files = walkDir(docsPath);
  if (!files.length) {
    return { filesProcessed: 0, chunksIndexed: 0 };
  }

  let totalChunks = 0;

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf8");
    const source = path.basename(filePath);
    const collection = deriveCollection(filePath, docsPath);
    const textChunks = chunkText(text);

    for (let i = 0; i < textChunks.length; i += EMBED_BATCH_SIZE) {
      const batch = textChunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await embedBatch(batch);

      const chunks = batch.map((chunkText, j) => ({
        id: `${source}::${i + j}`,
        text: chunkText,
        source,
        collection,
        embedding: embeddings[j],
      }));

      upsertChunks(chunks);
      totalChunks += chunks.length;
      onProgress?.({ file: source, chunksIndexed: totalChunks });
    }
  }

  return { filesProcessed: files.length, chunksIndexed: totalChunks };
}

module.exports = { ingestDocs };
