import { NodeData, BUSS_NODE_SIZE } from './store';

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 140;

function getNodeWidth(node: NodeData): number {
  return node.nodeType === 'buss' ? BUSS_NODE_SIZE : DEFAULT_NODE_WIDTH;
}

function getNodeHeight(node: NodeData): number {
  return node.height || (node.nodeType === 'buss' ? BUSS_NODE_SIZE : DEFAULT_NODE_HEIGHT);
}

/** Align all nodes' left edges to the reference node's left edge. */
export function alignLeft(
  referenceX: number,
  nodeIds: string[],
  nodes: Record<string, NodeData>
): Record<string, { x: number }> {
  const result: Record<string, { x: number }> = {};
  for (const id of nodeIds) {
    if (nodes[id]) result[id] = { x: referenceX };
  }
  return result;
}

/** Align all nodes' right edges to the reference node's right edge. */
export function alignRight(
  referenceX: number,
  referenceWidth: number,
  nodeIds: string[],
  nodes: Record<string, NodeData>
): Record<string, { x: number }> {
  const refRight = referenceX + referenceWidth;
  const result: Record<string, { x: number }> = {};
  for (const id of nodeIds) {
    if (!nodes[id]) continue;
    const w = getNodeWidth(nodes[id]);
    result[id] = { x: refRight - w };
  }
  return result;
}

/** Align all nodes' top edges to the reference node's top edge. */
export function alignTop(
  referenceY: number,
  nodeIds: string[],
  nodes: Record<string, NodeData>
): Record<string, { y: number }> {
  const result: Record<string, { y: number }> = {};
  for (const id of nodeIds) {
    if (nodes[id]) result[id] = { y: referenceY };
  }
  return result;
}

/** Align all nodes' bottom edges to the reference node's bottom edge. */
export function alignBottom(
  referenceY: number,
  referenceHeight: number,
  nodeIds: string[],
  nodes: Record<string, NodeData>
): Record<string, { y: number }> {
  const refBottom = referenceY + referenceHeight;
  const result: Record<string, { y: number }> = {};
  for (const id of nodeIds) {
    if (!nodes[id]) continue;
    const h = getNodeHeight(nodes[id]);
    result[id] = { y: refBottom - h };
  }
  return result;
}

/** Align all nodes' horizontal centers to the reference node's center. */
export function alignCenterH(
  referenceX: number,
  referenceWidth: number,
  nodeIds: string[],
  nodes: Record<string, NodeData>
): Record<string, { x: number }> {
  const refCenterX = referenceX + referenceWidth / 2;
  const result: Record<string, { x: number }> = {};
  for (const id of nodeIds) {
    if (!nodes[id]) continue;
    const w = getNodeWidth(nodes[id]);
    result[id] = { x: refCenterX - w / 2 };
  }
  return result;
}

/** Align all nodes' vertical centers to the reference node's center. */
export function alignCenterV(
  referenceY: number,
  referenceHeight: number,
  nodeIds: string[],
  nodes: Record<string, NodeData>
): Record<string, { y: number }> {
  const refCenterY = referenceY + referenceHeight / 2;
  const result: Record<string, { y: number }> = {};
  for (const id of nodeIds) {
    if (!nodes[id]) continue;
    const h = getNodeHeight(nodes[id]);
    result[id] = { y: refCenterY - h / 2 };
  }
  return result;
}

/** Distribute nodes evenly across the horizontal span. */
export function distributeH(
  nodeIds: string[],
  nodes: Record<string, NodeData>
): Record<string, { x: number }> {
  if (nodeIds.length < 3) return {};
  const valid = nodeIds.filter(id => nodes[id]);
  const sorted = [...valid].sort((a, b) => nodes[a].x - nodes[b].x);
  const minX = nodes[sorted[0]].x;
  const maxX = nodes[sorted[sorted.length - 1]].x;
  const step = (maxX - minX) / (sorted.length - 1);

  const result: Record<string, { x: number }> = {};
  sorted.forEach((id, i) => {
    result[id] = { x: minX + step * i };
  });
  return result;
}

/** Distribute nodes evenly across the vertical span. */
export function distributeV(
  nodeIds: string[],
  nodes: Record<string, NodeData>
): Record<string, { y: number }> {
  if (nodeIds.length < 3) return {};
  const valid = nodeIds.filter(id => nodes[id]);
  const sorted = [...valid].sort((a, b) => nodes[a].y - nodes[b].y);
  const minY = nodes[sorted[0]].y;
  const maxY = nodes[sorted[sorted.length - 1]].y;
  const step = (maxY - minY) / (sorted.length - 1);

  const result: Record<string, { y: number }> = {};
  sorted.forEach((id, i) => {
    result[id] = { y: minY + step * i };
  });
  return result;
}
