let tutorAnnotations = [];

function setTutorAnnotations(items = []) {
  tutorAnnotations = Array.isArray(items)
    ? items.map((item) => ({ ...item }))
    : [];
  return tutorAnnotations;
}

function getTutorAnnotations() {
  return tutorAnnotations.map((item) => ({ ...item }));
}

function clearTutorAnnotations() {
  tutorAnnotations = [];
}

module.exports = {
  setTutorAnnotations,
  getTutorAnnotations,
  clearTutorAnnotations,
};
