const path = require("path");

const DB_PATH = path.join(process.cwd(), "data", "lancedb");
const TABLE_NAME = "rag_chunks";

let dbPromise = null;
let tablePromise = null;
let tableInitLock = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const lancedb = await import("@lancedb/lancedb");
      return lancedb.connect(DB_PATH);
    })();
  }
  return dbPromise;
}

async function openExistingTable(db) {
  const names = await db.tableNames();
  if (!names.includes(TABLE_NAME)) {
    return null;
  }
  return db.openTable(TABLE_NAME);
}

async function resolveTable(createRows) {
  if (tablePromise) {
    return tablePromise;
  }

  if (!tableInitLock) {
    tableInitLock = (async () => {
      const db = await getDb();
      const existing = await openExistingTable(db);
      if (existing) {
        return existing;
      }

      if (!createRows?.length) {
        return null;
      }

      try {
        return await db.createTable(TABLE_NAME, createRows);
      } catch (err) {
        if (/already exists/i.test(String(err?.message || err))) {
          return db.openTable(TABLE_NAME);
        }
        throw err;
      }
    })().finally(() => {
      tableInitLock = null;
    });
  }

  const table = await tableInitLock;
  if (table) {
    tablePromise = Promise.resolve(table);
  }
  return table;
}

async function getTable() {
  if (tablePromise) {
    return tablePromise;
  }
  return resolveTable(null);
}

async function upsertChunks(chunks) {
  if (!chunks.length) return;

  const rows = chunks.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    source: chunk.source,
    collection: chunk.collection || "general",
    vector: Array.from(chunk.embedding),
  }));

  const table = await resolveTable(rows);
  if (!table) return;

  if (typeof table.mergeInsert === "function") {
    await table.mergeInsert("id", rows);
    return;
  }

  await table.add(rows);
}

async function search(queryEmbedding, { topK = 5, collection, minScore } = {}) {
  const table = await getTable();
  if (!table) return [];

  let query = table
    .vectorSearch(Array.from(queryEmbedding))
    .distanceType("cosine")
    .limit(topK);

  if (collection) {
    query = query.where(`collection = '${collection.replace(/'/g, "''")}'`);
  }

  const results = await query.toArray();
  return results
    .map((row) => ({
      id: row.id,
      text: row.text,
      source: row.source,
      collection: row.collection,
      score: row._distance != null ? 1 - row._distance : 0,
    }))
    .filter((row) => minScore == null || row.score >= minScore)
    .slice(0, topK);
}

async function getStats() {
  const table = await getTable();
  if (!table) {
    return { totalChunks: 0, collections: [], store: "lance" };
  }

  const rows = await table.query().select(["collection"]).toArray();
  const collections = [...new Set(rows.map((r) => r.collection).filter(Boolean))];
  return { totalChunks: rows.length, collections, store: "lance" };
}

async function close() {
  dbPromise = null;
  tablePromise = null;
  tableInitLock = null;
}

module.exports = {
  upsertChunks,
  search,
  getStats,
  close,
  DB_PATH,
  TABLE_NAME,
  getTable,
  resolveTable,
};
