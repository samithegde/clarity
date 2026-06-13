const { pointTarget } = require("./moondream-service");

async function refineWithMoondreamPoint({
  croppedBase64,
  cropW,
  cropH,
  targetElement,
} = {}) {
  if (!croppedBase64) {
    return null;
  }

  return pointTarget({
    imageBase64: croppedBase64,
    cropW,
    cropH,
    targetElement,
  });
}

module.exports = {
  refineWithMoondreamPoint,
};
