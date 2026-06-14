const CONTEXT7_API_BASE = "https://context7.com/api/v1";

function getApiKey() {
  return process.env.CONTEXT7_API_KEY?.trim() || null;
}

function isConfigured() {
  return Boolean(getApiKey());
}

/**
 * @param {{ query: string, libraryName?: string, topK?: number }} opts
 * @returns {Promise<Array<{ text: string, source: string, score: number, collection: string }>>}
 */
async function fetchFromContext7({ query, libraryName, topK = 5 }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[RAG] CONTEXT7_API_KEY not set — skipping Context7 retrieval");
    return [];
  }

  try {
    const { Context7 } = await import("@upstash/context7-sdk");
    const client = new Context7({ apiKey });

    const searchName = libraryName || query;
    const libraries = await client.searchLibrary(query, searchName);
    if (!libraries?.length) {
      console.warn("[RAG] Context7: no libraries matched", searchName);
      return [];
    }

    const library = libraries[0];
    const docs = await client.getContext(query, library.id, { type: "json" });
    const items = Array.isArray(docs) ? docs : [];

    return items.slice(0, topK).map((doc, index) => ({
      text: String(doc.content || doc.snippet || doc.text || "").trim(),
      source: doc.title ? `${library.name}: ${doc.title}` : library.name || library.id,
      score: 1 - index * 0.05,
      collection: "context7",
    })).filter((chunk) => chunk.text);
  } catch (err) {
    console.error("[RAG] Context7 fetch failed:", err.message);
    return [];
  }
}

module.exports = { fetchFromContext7, isConfigured, CONTEXT7_API_BASE };
