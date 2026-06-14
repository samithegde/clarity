const { fetchRemoteChunks, getProviderStatus } = require("./providers");

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

/**
 * Fetch knowledge chunks from remote providers (Context7 or web search).
 * @param {RetrievalPlan|string} planOrQuery
 * @param {{ topK?: number, collection?: string }} [options] - legacy options when passed a string
 */
async function retrieve(planOrQuery, options = {}) {
  if (typeof planOrQuery === "string") {
    return fetchRemoteChunks(
      { requiresRag: true, query: planOrQuery, retrievalSource: "web" },
      { topK: options.topK },
    );
  }

  return fetchRemoteChunks(planOrQuery, { topK: options.topK });
}

function getMinScore() {
  return 0;
}

module.exports = { retrieve, getMinScore, getProviderStatus };
