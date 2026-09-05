// src/shared/viewer-dock.ts と同じ木操作。判定を変えるときは両方直す。
function newDockId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneDock(node) {
  if (!node || typeof node !== 'object') {
    return structuredClone(DEFAULT_VIEWER_DOCK);
  }
  if (node.kind === 'leaf') {
    return { kind: 'leaf', id: node.id, types: [...(node.types || [])] };
  }
  return {
    kind: 'split',
    id: node.id,
    dir: node.dir === 'v' ? 'v' : 'h',
    ratio: Math.min(0.8, Math.max(0.2, Number(node.ratio) || 0.5)),
    a: cloneDock(node.a),
    b: cloneDock(node.b),
  };
}

function listDockLeaves(node) {
  if (!node) {
    return [];
  }
  if (node.kind === 'leaf') {
    return [node];
  }
  return [...listDockLeaves(node.a), ...listDockLeaves(node.b)];
}

function findDockLeaf(node, id) {
  return listDockLeaves(node).find((leaf) => leaf.id === id) || null;
}

function visibleDockTypes() {
  const display = collectViewerDisplay();
  return VIEWER_DOCK_TYPES.filter((type) => type === 'comment' || display[type]);
}

function pruneDock(node, visible = visibleDockTypes()) {
  const allowed = new Set(visible);
  const prune = (current) => {
    if (!current) {
      return null;
    }
    if (current.kind === 'leaf') {
      const types = current.types.filter((type) => allowed.has(type));
      return types.length ? { ...current, types } : null;
    }
    const a = prune(current.a);
    const b = prune(current.b);
    if (!a) {
      return b;
    }
    if (!b) {
      return a;
    }
    return { ...current, a, b };
  };
  return prune(cloneDock(node)) || {
    kind: 'leaf',
    id: 'dock-comments',
    types: [...visible],
  };
}

function ensureDockTypes(node) {
  const next = cloneDock(node);
  const assigned = new Set();
  for (const leaf of listDockLeaves(next)) {
    for (const type of leaf.types) {
      assigned.add(type);
    }
  }
  const missing = VIEWER_DOCK_TYPES.filter((type) => !assigned.has(type));
  if (missing.length === 0) {
    return next;
  }
  const leaves = listDockLeaves(next);
  const fallback = leaves.find((leaf) => !leaf.types.includes('comment')) || leaves[leaves.length - 1];
  if (fallback) {
    fallback.types.push(...missing);
  }
  return next;
}

function removeDockType(node, type) {
  for (const leaf of listDockLeaves(node)) {
    leaf.types = leaf.types.filter((item) => item !== type);
  }
}

function replaceDockNode(root, id, replacement) {
  if (root.kind === 'leaf') {
    return root.id === id ? replacement : root;
  }
  if (root.id === id) {
    return replacement;
  }
  return {
    ...root,
    a: replaceDockNode(root.a, id, replacement),
    b: replaceDockNode(root.b, id, replacement),
  };
}

function collapseDock(node) {
  if (node.kind === 'leaf') {
    return node.types.length ? node : null;
  }
  const a = collapseDock(node.a);
  const b = collapseDock(node.b);
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return { ...node, a, b };
}

function splitDockAround(target, incoming, edge) {
  const dir = edge === 'left' || edge === 'right' ? 'h' : 'v';
  const incomingFirst = edge === 'left' || edge === 'top';
  return {
    kind: 'split',
    id: newDockId('split'),
    dir,
    ratio: 0.5,
    a: incomingFirst ? incoming : target,
    b: incomingFirst ? target : incoming,
  };
}

function assignDockType(node, type, leafId) {
  const next = cloneDock(node);
  const target = findDockLeaf(next, leafId);
  if (!target) {
    return next;
  }
  removeDockType(next, type);
  if (!target.types.includes(type)) {
    target.types.push(type);
  }
  return ensureDockTypes(collapseDock(next) || cloneDock(DEFAULT_VIEWER_DOCK));
}

function dockTypeToEdge(node, type, targetLeafId, edge) {
  if (edge === 'center') {
    return assignDockType(node, type, targetLeafId);
  }
  const next = cloneDock(node);
  const target = findDockLeaf(next, targetLeafId);
  if (!target) {
    return next;
  }
  if (target.types.length === 1 && target.types[0] === type) {
    return next;
  }
  const visible = visibleDockTypes();
  const current = pruneDock(next, visible);
  if (listDockLeaves(current).length >= visible.length) {
    return ensureDockTypes(assignDockType(next, type, targetLeafId));
  }
  removeDockType(next, type);
  const incoming = { kind: 'leaf', id: newDockId('dock'), types: [type] };
  return ensureDockTypes(
    collapseDock(replaceDockNode(next, target.id, splitDockAround(target, incoming, edge)))
      || cloneDock(DEFAULT_VIEWER_DOCK),
  );
}

function dockLeafToEdge(node, sourceLeafId, targetLeafId, edge) {
  if (sourceLeafId === targetLeafId) {
    return cloneDock(node);
  }
  const next = cloneDock(node);
  const source = findDockLeaf(next, sourceLeafId);
  const target = findDockLeaf(next, targetLeafId);
  if (!source || !target) {
    return next;
  }
  const types = [...source.types];
  if (edge === 'center') {
    source.types = [];
    for (const type of types) {
      if (!target.types.includes(type)) {
        target.types.push(type);
      }
    }
    return ensureDockTypes(collapseDock(next) || cloneDock(DEFAULT_VIEWER_DOCK));
  }
  source.types = [];
  const incoming = { kind: 'leaf', id: source.id, types };
  return ensureDockTypes(
    collapseDock(replaceDockNode(next, target.id, splitDockAround(target, incoming, edge)))
      || cloneDock(DEFAULT_VIEWER_DOCK),
  );
}

function dockDropEdge(event, pane) {
  const rect = pane.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const edge = 0.28;
  if (x < edge) {
    return 'left';
  }
  if (x > 1 - edge) {
    return 'right';
  }
  if (y < edge) {
    return 'top';
  }
  if (y > 1 - edge) {
    return 'bottom';
  }
  return 'center';
}
