const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ingestDocs } = require("./ingest");
const { getStats } = require("./store");

const MANIFEST_PATH = path.join(process.cwd(), "data", "rag-manifest.json");

let indexingState = {
  indexing: false,
  lastIndexedAt: null,
  lastError: null,
};

function getDocsPath() {
  return (
    process.env.RAG_DOCS_PATH?.trim() ||
    path.join(process.cwd(), "docs")
  );
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

function buildDocsManifest(docsPath) {
  const files = walkDir(docsPath);
  const entries = files.map((filePath) => {
    const stat = fs.statSync(filePath);
    return {
      path: path.relative(docsPath, filePath).replace(/\\/g, "/"),
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    };
  });
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(entries))
    .digest("hex");
  return { hash, entries, docsPath };
}

function loadManifest() {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return null;
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveManifest(manifest) {
  const dir = path.dirname(MANIFEST_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        ...manifest,
        savedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

function needsReindex(docsPath) {
  const current = buildDocsManifest(docsPath);
  const saved = loadManifest();
  if (!saved || saved.hash !== current.hash || saved.docsPath !== docsPath) {
    return { needed: true, current };
  }
  return { needed: false, current };
}

async function getExtendedStats() {
  const stats = await Promise.resolve(getStats());
  return {
    ...stats,
    indexing: indexingState.indexing,
    lastIndexedAt: indexingState.lastIndexedAt,
    lastError: indexingState.lastError,
  };
}

async function runStartupIndex({ force = false } = {}) {
  if (indexingState.indexing) {
    return { skipped: true, reason: "already indexing" };
  }

  const docsPath = getDocsPath();
  const { needed, current } = needsReindex(docsPath);
  const stats = await Promise.resolve(getStats());

  if (!force && !needed && stats.totalChunks > 0) {
    return { skipped: true, reason: "manifest unchanged" };
  }

  if (!fs.existsSync(docsPath)) {
    return { skipped: true, reason: "docs path missing" };
  }

  indexingState.indexing = true;
  indexingState.lastError = null;

  try {
    const result = await ingestDocs(docsPath, {
      onProgress: ({ file, chunksIndexed }) => {
        console.log(`[RAG] indexing ${file} (${chunksIndexed} chunks)`);
      },
    });
    saveManifest(current);
    indexingState.lastIndexedAt = new Date().toISOString();
    console.log(
      `[RAG] startup index complete: ${result.filesProcessed} files, ${result.chunksIndexed} chunks`,
    );
    return { skipped: false, ...result };
  } catch (err) {
    indexingState.lastError = err.message;
    console.error("[RAG] startup index failed:", err.message);
    throw err;
  } finally {
    indexingState.indexing = false;
  }
}

function scheduleStartupIndex() {
  setImmediate(() => {
    runStartupIndex().catch((err) => {
      console.error("[RAG] background startup index error:", err.message);
    });
  });
}

function markIndexed(docsPath) {
  saveManifest(buildDocsManifest(docsPath));
}

module.exports = {
  MANIFEST_PATH,
  getDocsPath,
  needsReindex,
  runStartupIndex,
  scheduleStartupIndex,
  getExtendedStats,
  markIndexed,
  buildDocsManifest,
};
