function $(id) {
  return document.getElementById(id);
}

function setRangeLabel(id, value, unit) {
  const label = $(`${id}-value`);
  if (label) {
    label.textContent = `${value}${unit}`;
  }
}
