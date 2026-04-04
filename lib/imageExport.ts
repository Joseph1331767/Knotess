import { toPng, toJpeg } from 'html-to-image';
import { EditorSettings, NodeData } from './store';

export function computeGraphBoundingBox(nodes: Record<string, NodeData>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const nodeValues = Object.values(nodes);
  
  if (nodeValues.length === 0) {
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  nodeValues.forEach(node => {
    // Get absolute position logic similar to the viewer layout
    let path = [];
    let curr: any = node;
    const pathVis = new Set<string>();
    while (curr) {
      if (pathVis.has(curr.id)) break;
      pathVis.add(curr.id);
      path.unshift(curr);
      curr = curr.parentId ? nodes[curr.parentId] : null;
    }
    
    let absX = 0;
    let absY = 0;
    let scale = 1;
    
    for (let i = 0; i < path.length; i++) {
      absX += path[i].x * scale;
      absY += path[i].y * scale;
      if (i < path.length - 1) scale *= 0.5;
    }

    const w = ((node as any).width || 300) * scale;
    const h = ((node as any).height || 140) * scale;

    minX = Math.min(minX, absX);
    minY = Math.min(minY, absY);
    maxX = Math.max(maxX, absX + w);
    maxY = Math.max(maxY, absY + h);
  });

  // Adding generous padding
  const padding = 200;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export async function renderGraphToImage(options: {
  format: 'jpeg' | 'png';
  maxDimension?: number;
  quality?: number;
  canvasContainer: HTMLElement | null; // Pass node-container DOM directly 
}): Promise<Blob> {
  const { format, maxDimension = 16384, quality = 0.92, canvasContainer } = options;

  if (!canvasContainer) {
    throw new Error('Canvas container not found for rendering');
  }

  // Clone the canvas container into a fixed offscreen wrapper
  // We can't clone simply because react elements drop styles. 
  // html-to-image handles traversing dom and snapshotting.
  // We want to force the existing DOM element to render without capturing UI.
  // Wait! html-to-image accepts an element and `filter` function.
  // The canvas container we grab should be the direct bounding box of the `.editor-canvas`
  // We will pass the main editor canvas. But it is scaled!
  // To avoid DOM manipulation which is dangerous, we can just temporarily scale it to 1,
  // snapshot, and scale back. Or, pass a custom style to html-to-image.
  
  // Custom approach for pure DOM capture:
  const filter = (node: HTMLElement) => {
    // Ignore UI controls 
    const excludeClasses = ['zoom-controls', 'toolbar', 'sidebar', 'exclude-export'];
    if (node.classList) {
      for (const cls of excludeClasses) {
        if (node.classList.contains(cls)) return false;
      }
    }
    return true;
  };

  const fn = format === 'png' ? toPng : toJpeg;

  const dataUrl = await fn(canvasContainer, {
    filter,
    quality: format === 'jpeg' ? quality : undefined,
    pixelRatio: 2, // Retained resolution quality
    skipFonts: false, // Wait, skipFonts breaks icons. We keep it false
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      left: '0', 
      top: '0',
      minWidth: '5000px', // Forces full rendering regardless of clipped regions
      minHeight: '5000px',
    }
  });

  const response = await fetch(dataUrl);
  return response.blob();
}
