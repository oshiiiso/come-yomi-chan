import type { OverlayEventType } from './types';
import { DEFAULT_VIEWER_DISPLAY, ViewerDisplayMap } from './viewer-event';

// 種類の並びは ui/js/viewer-constants.js と揃える。
export const VIEWER_DOCK_TYPES: OverlayEventType[] = [
  'comment',
  'gift',
  'follow',
  'share',
  'superFan',
  'envelope',
  'portal',
  'like',
  'member',
];

export type ViewerDockEdge = 'left' | 'right' | 'top' | 'bottom' | 'center';
export type ViewerDockDir = 'h' | 'v';

export interface ViewerDockLeaf {
  kind: 'leaf';
  id: string;
  types: OverlayEventType[];
}

export interface ViewerDockSplit {
  kind: 'split';
  id: string;
  dir: ViewerDockDir;
  ratio: number;
  a: ViewerDockNode;
  b: ViewerDockNode;
}

export type ViewerDockNode = ViewerDockLeaf | ViewerDockSplit;

export const DEFAULT_VIEWER_DOCK: ViewerDockNode = {
  kind: 'split',
  id: 'dock-root',
  dir: 'h',
  ratio: 0.62,
  a: { kind: 'leaf', id: 'dock-comments', types: ['comment'] },
  b: {
    kind: 'leaf',
    id: 'dock-events',
    types: ['gift', 'follow', 'share', 'superFan', 'envelope', 'portal', 'like', 'member'],
  },
};

const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function clampRatio(value: unknown, fallback = 0.5): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, parsed));
}

function newDockId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function visibleDockTypes(
  display: ViewerDisplayMap = DEFAULT_VIEWER_DISPLAY,
): OverlayEventType[] {
  return VIEWER_DOCK_TYPES.filter((type) => type === 'comment' || display[type] === true);
}

export function maxDockPanes(display: ViewerDisplayMap = DEFAULT_VIEWER_DISPLAY): number {
  return visibleDockTypes(display).length;
}

export function cloneDock(node: ViewerDockNode): ViewerDockNode {
  if (node.kind === 'leaf') {
    return { kind: 'leaf', id: node.id, types: [...node.types] };
  }
  return {
    kind: 'split',
    id: node.id,
    dir: node.dir,
    ratio: node.ratio,
    a: cloneDock(node.a),
    b: cloneDock(node.b),
  };
}

export function listDockLeaves(node: ViewerDockNode): ViewerDockLeaf[] {
  if (node.kind === 'leaf') {
    return [node];
  }
  return [...listDockLeaves(node.a), ...listDockLeaves(node.b)];
}

export function dockPaneCount(node: ViewerDockNode): number {
  return listDockLeaves(node).length;
}

export function findDockLeaf(node: ViewerDockNode, id: string): ViewerDockLeaf | null {
  return listDockLeaves(node).find((leaf) => leaf.id === id) ?? null;
}

export function leafIdForType(node: ViewerDockNode, type: OverlayEventType): string | null {
  const leaf = listDockLeaves(node).find((item) => item.types.includes(type));
  return leaf?.id ?? null;
}

function normalizeTypes(raw: unknown): OverlayEventType[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<OverlayEventType>();
  const types: OverlayEventType[] = [];
  for (const item of raw) {
    const type = item === 'subscribe' ? 'superFan' : item;
    if (VIEWER_DOCK_TYPES.includes(type as OverlayEventType) && !seen.has(type as OverlayEventType)) {
      seen.add(type as OverlayEventType);
      types.push(type as OverlayEventType);
    }
  }
  return types;
}

export function normalizeViewerDock(raw: unknown): ViewerDockNode {
  const parsed = parseDock(raw);
  return ensureAllTypes(parsed ?? cloneDock(DEFAULT_VIEWER_DOCK));
}

function parseDock(raw: unknown): ViewerDockNode | null {
  const record = asRecord(raw);
  if (record.kind === 'leaf') {
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : newDockId('dock');
    return { kind: 'leaf', id, types: normalizeTypes(record.types) };
  }
  if (record.kind === 'split') {
    const a = parseDock(record.a);
    const b = parseDock(record.b);
    if (!a || !b) {
      return a ?? b ?? null;
    }
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : newDockId('split');
    const dir = record.dir === 'v' ? 'v' : 'h';
    return { kind: 'split', id, dir, ratio: clampRatio(record.ratio, 0.5), a, b };
  }
  return null;
}

function collectAssigned(node: ViewerDockNode): Set<OverlayEventType> {
  const assigned = new Set<OverlayEventType>();
  for (const leaf of listDockLeaves(node)) {
    for (const type of leaf.types) {
      assigned.add(type);
    }
  }
  return assigned;
}

export function ensureAllTypes(node: ViewerDockNode): ViewerDockNode {
  const next = cloneDock(node);
  const assigned = collectAssigned(next);
  const missing = VIEWER_DOCK_TYPES.filter((type) => !assigned.has(type));
  if (missing.length === 0) {
    return next;
  }
  const leaves = listDockLeaves(next);
  const fallback = leaves.find((leaf) => !leaf.types.includes('comment')) ?? leaves[leaves.length - 1];
  fallback.types.push(...missing);
  return next;
}

export function pruneDock(
  node: ViewerDockNode,
  display: ViewerDisplayMap = DEFAULT_VIEWER_DISPLAY,
): ViewerDockNode {
  const visible = new Set(visibleDockTypes(display));
  const pruned = pruneNode(cloneDock(node), visible);
  if (!pruned) {
    return {
      kind: 'leaf',
      id: 'dock-comments',
      types: [...visible],
    };
  }
  return pruned;
}

function pruneNode(node: ViewerDockNode, visible: Set<OverlayEventType>): ViewerDockNode | null {
  if (node.kind === 'leaf') {
    const types = node.types.filter((type) => visible.has(type));
    if (types.length === 0) {
      return null;
    }
    return { ...node, types };
  }
  const a = pruneNode(node.a, visible);
  const b = pruneNode(node.b, visible);
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return { ...node, a, b };
}

export function setDockRatio(node: ViewerDockNode, splitId: string, ratio: number): ViewerDockNode {
  const next = cloneDock(node);
  const apply = (current: ViewerDockNode): void => {
    if (current.kind === 'split') {
      if (current.id === splitId) {
        current.ratio = clampRatio(ratio, current.ratio);
        return;
      }
      apply(current.a);
      apply(current.b);
    }
  };
  apply(next);
  return next;
}

function removeType(node: ViewerDockNode, type: OverlayEventType): void {
  for (const leaf of listDockLeaves(node)) {
    leaf.types = leaf.types.filter((item) => item !== type);
  }
}

function replaceNode(
  root: ViewerDockNode,
  id: string,
  replacement: ViewerDockNode,
): ViewerDockNode {
  if (root.kind === 'leaf') {
    return root.id === id ? replacement : root;
  }
  if (root.id === id) {
    return replacement;
  }
  return {
    ...root,
    a: replaceNode(root.a, id, replacement),
    b: replaceNode(root.b, id, replacement),
  };
}

function collapseEmpty(node: ViewerDockNode): ViewerDockNode | null {
  if (node.kind === 'leaf') {
    return node.types.length === 0 ? null : node;
  }
  const a = collapseEmpty(node.a);
  const b = collapseEmpty(node.b);
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return { ...node, a, b };
}

function splitAround(
  target: ViewerDockLeaf,
  incoming: ViewerDockLeaf,
  edge: Exclude<ViewerDockEdge, 'center'>,
): ViewerDockSplit {
  const dir: ViewerDockDir = edge === 'left' || edge === 'right' ? 'h' : 'v';
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

export function assignTypeToLeaf(
  node: ViewerDockNode,
  type: OverlayEventType,
  leafId: string,
): ViewerDockNode {
  const next = cloneDock(node);
  const target = findDockLeaf(next, leafId);
  if (!target || !VIEWER_DOCK_TYPES.includes(type)) {
    return next;
  }
  removeType(next, type);
  if (!target.types.includes(type)) {
    target.types.push(type);
  }
  return ensureAllTypes(collapseEmpty(next) ?? cloneDock(DEFAULT_VIEWER_DOCK));
}

export function dockTypeToEdge(
  node: ViewerDockNode,
  type: OverlayEventType,
  targetLeafId: string,
  edge: ViewerDockEdge,
  display: ViewerDisplayMap = DEFAULT_VIEWER_DISPLAY,
): ViewerDockNode {
  if (edge === 'center') {
    return assignTypeToLeaf(node, type, targetLeafId);
  }
  const next = cloneDock(node);
  const target = findDockLeaf(next, targetLeafId);
  if (!target || !VIEWER_DOCK_TYPES.includes(type)) {
    return next;
  }
  if (target.types.length === 1 && target.types[0] === type) {
    return next;
  }
  const visible = visibleDockTypes(display);
  const pruned = pruneDock(next, display);
  const count = dockPaneCount(pruned);
  if (count >= visible.length) {
    return ensureAllTypes(assignTypeToLeaf(next, type, targetLeafId));
  }
  removeType(next, type);
  const incoming: ViewerDockLeaf = {
    kind: 'leaf',
    id: newDockId('dock'),
    types: [type],
  };
  const replaced = replaceNode(next, target.id, splitAround(target, incoming, edge));
  return ensureAllTypes(collapseEmpty(replaced) ?? cloneDock(DEFAULT_VIEWER_DOCK));
}

export function dockLeafToEdge(
  node: ViewerDockNode,
  sourceLeafId: string,
  targetLeafId: string,
  edge: ViewerDockEdge,
  display: ViewerDisplayMap = DEFAULT_VIEWER_DISPLAY,
): ViewerDockNode {
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
    return ensureAllTypes(collapseEmpty(next) ?? cloneDock(DEFAULT_VIEWER_DOCK));
  }
  source.types = [];
  const incoming: ViewerDockLeaf = {
    kind: 'leaf',
    id: source.id,
    types,
  };
  const replaced = replaceNode(next, target.id, splitAround(target, incoming, edge));
  return ensureAllTypes(collapseEmpty(replaced) ?? cloneDock(DEFAULT_VIEWER_DOCK));
}

export function paneTitleTypes(types: OverlayEventType[]): OverlayEventType[] {
  return VIEWER_DOCK_TYPES.filter((type) => types.includes(type));
}
