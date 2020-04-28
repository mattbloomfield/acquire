function createEl(tag, options = {}, attrs = {}) {
  const el = document.createElement(tag);
  for (opt in options) {
    el[opt] = options[opt];
  }
  for (attr in attrs) {
    el.setAttribute(attr, attrs[attr]);
  }
  return el;
}

function emptyEl(id) {
  const el = document.getElementById(id);
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function removeEl(id) {
  const element = document.getElementById(id);
  if (!element) return;
  element.parentNode.removeChild(element);
}

function hideEl(id) {
  document.getElementById(id).style.display = 'none';
}

function showEl(id) {
  document.getElementById(id).style.display = '';
}
