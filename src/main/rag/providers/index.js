const context7 = require("./context7");
const webSearch = require("./web-search");

/**
 * @param {import('../retrieve').RetrievalPlan} plan
 * @param {{ topK?: number }} [options]
 */
async function fetchRemoteChunks(plan, { topK } = {}) {
  const k = (topK ?? Number(process.env.RAG_TOP_K)) || 5;
  const query = (plan.query || plan.ragQuery || "").trim();
  if (!query) return [];

  const source = plan.retrievalSource || "web";
  let chunks = [];

  if (source === "context7") {
    chunks = await context7.fetchFromContext7({
      query,
      libraryName: plan.libraryName,
      topK: k,
    });
    if (!chunks.length && webSearch.isConfigured()) {
      console.log("[RAG] Context7 empty — falling back to web search");
      chunks = await webSearch.fetchFromWebSearch({ query, topK: k });
    }
  } else {
    chunks = await webSearch.fetchFromWebSearch({ query, topK: k });
    if (!chunks.length && context7.isConfigured()) {
      console.log("[RAG] Web search empty — falling back to Context7");
      chunks = await context7.fetchFromContext7({
        query,
        libraryName: plan.libraryName || plan.targetApp,
        topK: k,
      });
    }
  }

  return chunks;
}

function getProviderStatus() {
  return {
    mode: "remote",
    context7: context7.isConfigured(),
    webSearch: webSearch.isConfigured(),
    webProvider: webSearch.getProvider(),
  };
}

module.exports = { fetchRemoteChunks, getProviderStatus };
