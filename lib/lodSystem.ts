import { LODThresholds, EditorSettings } from './store';

export const LOD_DEFAULTS: LODThresholds = {
  culledMax: 5,
  starMax: 10,
  shapeMax: 20,
  compactMax: 40,
};

export type LODState = 'culled' | 'star' | 'shape' | 'compact' | 'full';

/**
 * Compute apparent screen-pixel height of a node.
 * Base node height is ~140px (nodeHeight state). At depth D,
 * the node is rendered at scale 0.5^D. Camera zoom further scales.
 * screenSize = nodeWorldHeight * (0.5^depth) * cameraZoom
 */
export function computeNodeScreenSize(
  nodeWorldHeight: number,
  depth: number,
  cameraZoom: number
): number {
  return nodeWorldHeight * Math.pow(0.5, depth) * cameraZoom;
}

export function getLODState(screenSize: number, thresholds: LODThresholds): LODState {
  if (screenSize < thresholds.culledMax) return 'culled';
  if (screenSize < thresholds.starMax) return 'star';
  if (screenSize < thresholds.shapeMax) return 'shape';
  if (screenSize < thresholds.compactMax) return 'compact';
  return 'full';
}

export function getEffectiveLODThresholds(settings?: EditorSettings): LODThresholds {
  return settings?.lodThresholds ?? LOD_DEFAULTS;
}
