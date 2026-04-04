'use client';

import { useStore } from '@/lib/store';
import {
  alignLeft, alignRight, alignTop, alignBottom,
  alignCenterH, alignCenterV, distributeH, distributeV
} from '@/lib/alignment';
import {
  AlignStartVertical, AlignEndVertical,
  AlignStartHorizontal, AlignEndHorizontal,
  AlignCenterVertical, AlignCenterHorizontal,
  GripHorizontal, GripVertical
} from 'lucide-react';

function getNodeWidth(node: { nodeType?: string }): number {
  return node.nodeType === 'buss' ? 130 : 280;
}

function getNodeHeight(node: { nodeType?: string; height?: number }): number {
  return node.height || (node.nodeType === 'buss' ? 130 : 140);
}

export function applyAlignment(
  operation: string,
  referenceId: string,
  otherIds: string[]
) {
  const state = useStore.getState();
  const { nodes, updateNode } = state;
  const ref = nodes[referenceId];
  if (!ref) return;

  const refW = getNodeWidth(ref);
  const refH = getNodeHeight(ref);
  const allIds = [referenceId, ...otherIds];
  let updates: Record<string, { x?: number; y?: number }> = {};

  switch (operation) {
    case 'left':
      updates = alignLeft(ref.x, otherIds, nodes);
      break;
    case 'right':
      updates = alignRight(ref.x, refW, otherIds, nodes);
      break;
    case 'top':
      updates = alignTop(ref.y, otherIds, nodes);
      break;
    case 'bottom':
      updates = alignBottom(ref.y, refH, otherIds, nodes);
      break;
    case 'centerH':
      updates = alignCenterH(ref.x, refW, otherIds, nodes);
      break;
    case 'centerV':
      updates = alignCenterV(ref.y, refH, otherIds, nodes);
      break;
    case 'distributeH':
      updates = distributeH(allIds, nodes);
      break;
    case 'distributeV':
      updates = distributeV(allIds, nodes);
      break;
  }

  for (const [id, pos] of Object.entries(updates)) {
    updateNode(id, pos);
  }
}

export function AlignmentToolbar() {
  const selectedNodeIds = useStore(state => state.selectedNodeIds);

  if (selectedNodeIds.length < 2) return null;

  const referenceId = selectedNodeIds[0];
  const otherIds = selectedNodeIds.slice(1);

  const buttons = [
    { icon: AlignStartVertical, op: 'left', title: 'Align Left (Alt+L)' },
    { icon: AlignEndVertical, op: 'right', title: 'Align Right (Alt+R)' },
    { icon: AlignStartHorizontal, op: 'top', title: 'Align Top (Alt+T)' },
    { icon: AlignEndHorizontal, op: 'bottom', title: 'Align Bottom (Alt+B)' },
    { icon: AlignCenterVertical, op: 'centerH', title: 'Center Horizontal (Alt+C)' },
    { icon: AlignCenterHorizontal, op: 'centerV', title: 'Center Vertical (Alt+M)' },
    { icon: GripHorizontal, op: 'distributeH', title: 'Distribute Horizontal (Alt+H)' },
    { icon: GripVertical, op: 'distributeV', title: 'Distribute Vertical (Alt+V)' },
  ];

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-[#161b22]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] p-1.5">
      {buttons.map(({ icon: Icon, op, title }, i) => (
        <span key={op}>
          {i === 4 && <div className="w-px h-5 bg-white/[0.08] mx-0.5" />}
          {i === 6 && <div className="w-px h-5 bg-white/[0.08] mx-0.5" />}
          <button
            onClick={() => applyAlignment(op, referenceId, otherIds)}
            className="p-2 hover:bg-white/[0.1] rounded-lg text-neutral-400 hover:text-white transition-colors"
            title={title}
          >
            <Icon className="w-4 h-4" />
          </button>
        </span>
      ))}
    </div>
  );
}
