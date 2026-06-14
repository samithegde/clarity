const { fetchRemoteChunks, getProviderStatus } = require("./providers");
const { embed } = require("./embedder");
const { search } = require("./store");

/**
 * @typedef {Object} RetrievalPlan
 * @property {boolean} requiresRag
 * @property {string} [query]
 * @property {string} [ragQuery]
 * @property {string} [intent]
 * @property {boolean} [needsOnScreenGuidance]
 * @property {string} [targetApp]
 * @property {'context7'|'web'} [retrievalSource]
 * @property {string} [libraryName]
 */

async function retrieveLocal(query, { topK, collection } = {}) {
  const k = topK ?? (Number(process.env.RAG_TOP_K) || 5);
  const queryEmbedding = await embed(query);
  return search(queryEmbedding, { topK: k, collection });
}

/**
 * Fetch knowledge chunks from remote providers (Context7 or web search),
 * falling back to the local LanceDB/JSON store when remote is unavailable or empty.
 * @param {RetrievalPlan|string} planOrQuery
 * @param {{ topK?: number, collection?: string }} [options]
 */
async function retrieve(planOrQuery, options = {}) {
  const providers = getProviderStatus();
  const hasRemote = providers.context7 || providers.webSearch;

  if (typeof planOrQuery === "string") {
    const query = planOrQuery.trim();
    if (!query) return [];

    if (hasRemote) {
      const remote = await fetchRemoteChunks(
        { requiresRag: true, query, retrievalSource: "web" },
        { topK: options.topK },
      );
      if (remote.length) return remote;
    }

    return retrieveLocal(query, options);
  }

  const query = (planOrQuery.query || planOrQuery.ragQuery || "").trim();
  if (!query) return [];

  if (hasRemote) {
    const remote = await fetchRemoteChunks(planOrQuery, { topK: options.topK });
    if (remote.length) return remote;
  }

  return retrieveLocal(query, options);
}

function getMinScore() {
  return 0;
}

module.exports = { retrieve, retrieveLocal, getMinScore, getProviderStatus };
