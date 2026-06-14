const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-004";

function getApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GEMENI_API_KEY?.trim() || null;
}

function getEmbeddingModel() {
  return process.env.RAG_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
}

async function embedBatch(texts) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const model = getEmbeddingModel();
  const url = `${GEMINI_API_BASE}/models/${model}:batchEmbedContents`;

  const requests = texts.map((text) => ({
    model: `models/${model}`,
    content: { parts: [{ text }] },
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({ requests }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error?.message || `Embedding API error (${response.status})`
    );
  }

  if (!Array.isArray(payload.embeddings)) {
    throw new Error("Embedding API returned unexpected shape.");
  }

  return payload.embeddings.map((e) => e.values);
}

async function embed(text) {
  const [vector] = await embedBatch([text]);
  return vector;
}

module.exports = { embed, embedBatch };
