import { NodeData, BUSS_NODE_SIZE } from './store';

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 140;

function getNodeWidth(node: NodeData): number {
  return node.nodeType === 'buss' ? BUSS_NODE_SIZE : DEFAULT_NODE_WIDTH;
}

function getNodeHeight(node: NodeData): number {
  return node.height || (node.nodeType === 'buss' ? BUSS_NODE_SIZE : DEFAULT_NODE_HEIGHT);
}

/** Compute the centroid (average x, y) of a set of nodes. */
export function computeCentroid(
  nodeIds: string[],
  nodes: Record<string, NodeData>
): { x: number; y: number } {
  const valid = nodeIds.filter(id => nodes[id]);
  if (valid.length === 0) return { x: 0, y: 0 };

  let sumX = 0, sumY = 0;
  for (const id of valid) {
    const n = nodes[id];
    sumX += n.x + getNodeWidth(n) / 2;
    sumY += n.y + getNodeHeight(n) / 2;
  }
  return { x: sumX / valid.length, y: sumY / valid.length };
}

/** Compute the bounding box of a set of nodes. */
export function computeBoundingBox(
  nodeIds: string[],
  nodes: Record<string, NodeData>
): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
  const valid = nodeIds.filter(id => nodes[id]);
  if (valid.length === 0) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };

  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const id of valid) {
    const n = nodes[id];
    const w = getNodeWidth(n);
    const h = getNodeHeight(n);
    left = Math.min(left, n.x);
    top = Math.min(top, n.y);
    right = Math.max(right, n.x + w);
    bottom = Math.max(bottom, n.y + h);
  }
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/**
 * Compute new positions after scaling all nodes around a centroid.
 * Each node's center is moved: newCenter = centroid + (oldCenter - centroid) * scaleFactor.
 * Returns a map of new {x, y} values (top-left corner).
 */
export function scalePositions(
  nodeIds: string[],
  scaleFactor: number,
  centroid: { x: number; y: number },
  nodes: Record<string, NodeData>
): Record<string, { x: number; y: number }> {
  const result: Record<string, { x: number; y: number }> = {};
  for (const id of nodeIds) {
    const n = nodes[id];
    if (!n) continue;
    const w = getNodeWidth(n);
    const h = getNodeHeight(n);
    const cx = n.x + w / 2;
    const cy = n.y + h / 2;
    const newCx = centroid.x + (cx - centroid.x) * scaleFactor;
    const newCy = centroid.y + (cy - centroid.y) * scaleFactor;
    result[id] = { x: newCx - w / 2, y: newCy - h / 2 };
  }
  return result;
}
