#!/usr/bin/env node
/**
 * Migrate rag-index.json chunks into LanceDB.
 * Re-embeds all docs when switching to local MiniLM embeddings.
 *
 * Usage: node scripts/migrate-rag-to-lance.js [--re-embed]
 */
const fs = require("fs");
const path = require("path");

async function main() {
  const reEmbed = process.argv.includes("--re-embed");
  const jsonPath = path.join(process.cwd(), "data", "rag-index.json");

  process.env.RAG_STORE = "lance";
  if (reEmbed) {
    process.env.RAG_EMBEDDER = "local";
  } else {
    process.env.RAG_EMBEDDER = process.env.RAG_EMBEDDER || "gemini";
  }

  const { ingestDocs } = require("../src/main/rag/ingest");
  const { getStats, lanceStore } = require("../src/main/rag/store");
  const { markIndexed, getDocsPath } = require("../src/main/rag/startup-index");

  if (reEmbed) {
    console.log("[migrate] Re-ingesting docs with current embedder...");
    const docsPath = getDocsPath();
    const result = await ingestDocs(docsPath);
    markIndexed(docsPath);
    console.log(
      `[migrate] Done: ${result.filesProcessed} files, ${result.chunksIndexed} chunks`,
    );
    return;
  }

  if (!fs.existsSync(jsonPath)) {
    console.log("[migrate] No rag-index.json found; run ingest or startup index instead.");
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const chunks = index.chunks || [];
  if (!chunks.length) {
    console.log("[migrate] JSON index is empty.");
    process.exit(0);
  }

  console.log(`[migrate] Copying ${chunks.length} chunks to LanceDB...`);
  await lanceStore.upsertChunks(chunks);

  const stats = await getStats();
  console.log(`[migrate] LanceDB stats:`, stats);

  const sample = chunks[0]?.embedding;
  if (sample?.length) {
    const results = await lanceStore.search(sample, { topK: 1 });
    console.log(`[migrate] Sample search score: ${results[0]?.score ?? "n/a"}`);
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err.message);
  process.exit(1);
});
