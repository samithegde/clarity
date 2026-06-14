function getProvider() {
  return (process.env.RAG_WEB_PROVIDER?.trim() || "tavily").toLowerCase();
}

function getTavilyKey() {
  return process.env.TAVILY_API_KEY?.trim() || null;
}

function getSerperKey() {
  return process.env.SERPER_API_KEY?.trim() || null;
}

function isConfigured() {
  const provider = getProvider();
  if (provider === "serper") return Boolean(getSerperKey());
  return Boolean(getTavilyKey());
}

async function fetchFromTavily(query, topK) {
  const apiKey = getTavilyKey();
  if (!apiKey) {
    console.warn("[RAG] TAVILY_API_KEY not set — skipping web search");
    return [];
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: topK,
      include_answer: false,
      search_depth: "basic",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Tavily error (${response.status})`);
  }

  return (payload.results || []).map((result, index) => ({
    text: String(result.content || "").trim(),
    source: result.url || result.title || "web",
    score: typeof result.score === "number" ? result.score : 1 - index * 0.05,
    collection: "web",
  })).filter((chunk) => chunk.text);
}

async function fetchFromSerper(query, topK) {
  const apiKey = getSerperKey();
  if (!apiKey) {
    console.warn("[RAG] SERPER_API_KEY not set — skipping web search");
    return [];
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, num: topK }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `Serper error (${response.status})`);
  }

  const organic = payload.organic || [];
  return organic.slice(0, topK).map((result, index) => ({
    text: String(result.snippet || result.title || "").trim(),
    source: result.link || result.title || "web",
    score: 1 - index * 0.05,
    collection: "web",
  })).filter((chunk) => chunk.text);
}

/**
 * @param {{ query: string, topK?: number }} opts
 */
async function fetchFromWebSearch({ query, topK = 5 }) {
  const provider = getProvider();
  try {
    if (provider === "serper") {
      return fetchFromSerper(query, topK);
    }
    return fetchFromTavily(query, topK);
  } catch (err) {
    console.error("[RAG] Web search failed:", err.message);
    return [];
  }
}

module.exports = {
  fetchFromWebSearch,
  isConfigured,
  getProvider,
};
