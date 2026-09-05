function parseUserLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.replace(/^@/, '').trim())
    .filter(Boolean);
}

function listedUserIdFrom(user) {
  const id = String(user?.uniqueId || '').replace(/^@/, '').trim();
  return id || String(user?.nickname || '').trim();
}

function userListHas(list, user) {
  const uniqueId = String(user?.uniqueId || '').replace(/^@/, '').trim().toLowerCase();
  const nickname = String(user?.nickname || '').trim().toLowerCase();
  return (list || []).some((entry) => {
    const id = String(entry || '').replace(/^@/, '').trim().toLowerCase();
    return Boolean(id) && (id === uniqueId || id === nickname);
  });
}

function addUserLine(list, id) {
  const key = String(id || '').replace(/^@/, '').trim();
  if (!key) {
    return list;
  }
  const lower = key.toLowerCase();
  if ((list || []).some((entry) => entry.replace(/^@/, '').trim().toLowerCase() === lower)) {
    return list;
  }
  return [...list, key];
}

function removeUserLine(list, user) {
  return (list || []).filter((entry) => {
    const id = String(entry || '').replace(/^@/, '').trim().toLowerCase();
    const uniqueId = String(user?.uniqueId || '').replace(/^@/, '').trim().toLowerCase();
    const nickname = String(user?.nickname || '').trim().toLowerCase();
    return Boolean(id) && id !== uniqueId && id !== nickname;
  });
}

function writeUserLines(fieldId, list) {
  const el = $(fieldId);
  if (el) {
    el.value = (list || []).join('\n');
  }
}
