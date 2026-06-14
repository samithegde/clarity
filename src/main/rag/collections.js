const KNOWN_COLLECTIONS = {
  "google-docs": "Google Docs",
  figma: "Figma",
  vscode: "VS Code",
  "internal-wiki": "Internal Wiki",
  general: "General",
  study: "Study Materials",
};

function resolveCollection(targetApp) {
  if (!targetApp) return null;
  const normalized = targetApp.toLowerCase().replace(/\s+/g, "-");
  if (KNOWN_COLLECTIONS[normalized]) return normalized;
  for (const key of Object.keys(KNOWN_COLLECTIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) return key;
  }
  return null;
}

function resolveTutorCollection(targetApp) {
  const appCollection = resolveCollection(targetApp);
  if (appCollection && appCollection !== "study") {
    return appCollection;
  }
  return "study";
}

module.exports = {
  KNOWN_COLLECTIONS,
  resolveCollection,
  resolveTutorCollection,
};
