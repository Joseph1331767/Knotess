'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { applyAlignment } from '@/components/AlignmentToolbar';

export function useKeyboardShortcuts() {
  const { undo, redo, cut, copy, paste, save, deleteNode, selectedNodeIds, clearSelection, rootNodeId, dictationActive, setDictationActive, isSettingsOpen, setIsSettingsOpen } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // STT Dictation toggling - works everywhere, even inside inputs
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
          alert('Speech-to-text is not supported in this browser');
          return;
        }
        setDictationActive(!dictationActive);
        return;
      }

      // Don't fire other shortcuts when typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (isCtrl && (e.key === ',' || e.code === 'Comma')) {
        e.preventDefault();
        setIsSettingsOpen(!isSettingsOpen);
        return;
      }

      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (isCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key === 's') {
        e.preventDefault();
        save();
      } else if (isCtrl && e.key === 'x') {
        e.preventDefault();
        cut();
      } else if (isCtrl && e.key === 'c') {
        e.preventDefault();
        copy();
      } else if (isCtrl && e.key === 'v') {
        e.preventDefault();
        paste(selectedNodeIds[0] || rootNodeId, 200, 200);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          const confirmed = window.confirm(
            `Delete ${selectedNodeIds.length} selected node(s)? This cannot be undone.`
          );
          if (confirmed) {
            selectedNodeIds.forEach((id) => deleteNode(id));
          }
        }
      } else if (e.key === 'Escape') {
        clearSelection();
      } else if (e.altKey && selectedNodeIds.length >= 2) {
        // Alignment shortcuts — only when 2+ nodes are selected
        const referenceId = selectedNodeIds[0];
        const otherIds = selectedNodeIds.slice(1);
        const alignOps: Record<string, string> = {
          'l': 'left', 'r': 'right', 't': 'top', 'b': 'bottom',
          'c': 'centerH', 'm': 'centerV', 'h': 'distributeH', 'v': 'distributeV'
        };
        const op = alignOps[e.key.toLowerCase()];
        if (op) {
          e.preventDefault();
          applyAlignment(op, referenceId, otherIds);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, cut, copy, paste, save, deleteNode, selectedNodeIds, clearSelection, rootNodeId, isSettingsOpen, setIsSettingsOpen, dictationActive, setDictationActive]);
}
