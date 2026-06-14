const path = require("path");
const { app } = require("electron");

let embedderPromise = null;

function getCacheDir() {
  try {
    return path.join(app.getPath("userData"), "transformers-cache");
  } catch {
    return path.join(process.cwd(), "data", "transformers-cache");
  }
}

function meanPool(output) {
  const data = output.data;
  const dims = output.dims;
  const seqLen = dims[1];
  const hidden = dims[2];
  const pooled = new Float32Array(hidden);

  for (let i = 0; i < hidden; i++) {
    let sum = 0;
    for (let t = 0; t < seqLen; t++) {
      sum += data[t * hidden + i];
    }
    pooled[i] = sum / seqLen;
  }

  let norm = 0;
  for (let i = 0; i < pooled.length; i++) {
    norm += pooled[i] * pooled[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < pooled.length; i++) {
    pooled[i] /= norm;
  }

  return Array.from(pooled);
}

async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = true;
      env.useBrowserCache = false;
      env.cacheDir = getCacheDir();

      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        quantized: true,
      });
    })();
  }
  return embedderPromise;
}

async function embed(text) {
  const [vector] = await embedBatch([text]);
  return vector;
}

async function embedBatch(texts) {
  const extractor = await getEmbedder();
  const vectors = [];

  for (const text of texts) {
    const output = await extractor(text, { pooling: "none", normalize: false });
    vectors.push(meanPool(output));
  }

  return vectors;
}

module.exports = { embed, embedBatch, getCacheDir };
