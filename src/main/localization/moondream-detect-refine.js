const { detectTarget } = require("./moondream-service");

async function refineWithMoondreamDetect({
  croppedBase64,
  cropW,
  cropH,
  targetElement,
} = {}) {
  if (!croppedBase64) {
    return null;
  }

  return detectTarget({
    imageBase64: croppedBase64,
    cropW,
    cropH,
    targetElement,
  });
}

module.exports = {
  refineWithMoondreamDetect,
};
