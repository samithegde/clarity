const { chat, chatStep, planRetrieval } = require("../gemini/service");
const { retrieve, getProviderStatus } = require("../rag/retrieve");
const { routeIntentHeuristic } = require("../rag/heuristics");
const { getChatWindow } = require("../window");

let sessionRecipe = null;

function isRagEnabled() {
  return process.env.RAG_ENABLED !== "false";
}

function emitRagStatus(phase, extra = {}) {
  const chatWin = getChatWindow();
  if (!chatWin || chatWin.isDestroyed()) return;
  chatWin.webContents.send("chat:rag-status", { phase, ...extra });
}

async function buildRecipe(userText, history, { onPhase } = {}) {
  if (!isRagEnabled() || !userText) return null;

  const providers = getProviderStatus();
  if (!providers.context7 && !providers.webSearch) {
    console.warn("[RAG] No remote providers configured (CONTEXT7_API_KEY or TAVILY_API_KEY)");
    return null;
  }

  try {
    const heuristic = routeIntentHeuristic(userText);
    let plan;

    if (heuristic.skip) {
      plan = heuristic.plan;
    } else {
      onPhase?.("routing");
      emitRagStatus("routing");
      plan = await planRetrieval(userText, history);
    }

    if (!plan.requiresRag) {
      onPhase?.("idle");
      emitRagStatus("idle");
      return null;
    }

    const ragQuery = (plan.query || plan.ragQuery || "").trim();
    if (!ragQuery) {
      onPhase?.("idle");
      emitRagStatus("idle");
      return null;
    }

    onPhase?.("searching");
    emitRagStatus("searching", {
      source: plan.retrievalSource || "web",
    });

    const chunks = await retrieve(plan);

    onPhase?.("idle");
    emitRagStatus("idle");

    if (!chunks.length) return null;

    return {
      intent: plan.intent,
      ragQuery,
      retrievalSource: plan.retrievalSource,
      needsOnScreenGuidance: plan.needsOnScreenGuidance,
      chunks,
    };
  } catch (err) {
    emitRagStatus("idle");
    console.error("[RAG] retrieval failed:", err.message);
    return null;
  }
}

function registerChatIpc(ipcMain) {
  ipcMain.handle("chat:send", async (_event, payload) => {
    const history = payload?.history;
    if (!Array.isArray(history) || !history.length) {
      throw new Error("Chat history is required.");
    }

    const lastUser = [...history].reverse().find((m) => m.sender === "user");
    const userText = lastUser?.text || "";

    const recipe = await buildRecipe(userText, history);
    sessionRecipe = recipe;

    return chat(history, { recipe });
  });

  ipcMain.handle("chat:step", async (_event, payload) => {
    const { goal, lastAction, screenshotBase64 } = payload ?? {};
    if (!goal) {
      throw new Error("goal is required.");
    }

    return chatStep(goal, lastAction ?? "", screenshotBase64 ?? null, {
      recipe: sessionRecipe,
    });
  });
}

module.exports = { registerChatIpc, buildRecipe };
