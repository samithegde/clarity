const gemini = require("../gemini/service");
const ollama = require("../ollama/service");

function useGeminiModel() {
  const raw =
    process.env.USE_GEMINI_MODEL?.trim() ||
    process.env.USE_GEMENI_MODEL?.trim();

  if (raw === undefined || raw === "") return true;
  const normalized = raw.toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "no";
}

function getActiveProvider() {
  return useGeminiModel() ? "gemini" : "ollama";
}

function chat(history, options) {
  return useGeminiModel()
    ? gemini.chat(history, options)
    : ollama.chat(history, options);
}

function chatStep(goal, lastActionDescription, screenshotBase64, options) {
  return useGeminiModel()
    ? gemini.chatStep(goal, lastActionDescription, screenshotBase64, options)
    : ollama.chatStep(goal, lastActionDescription, screenshotBase64, options);
}

function planRetrieval(userMessage, history, options) {
  return useGeminiModel()
    ? gemini.planRetrieval(userMessage, history, options)
    : ollama.planRetrieval(userMessage, history, options);
}

module.exports = {
  chat,
  chatStep,
  planRetrieval,
  useGeminiModel,
  getActiveProvider,
};
