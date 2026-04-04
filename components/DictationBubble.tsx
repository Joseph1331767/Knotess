'use client';

import { useEffect, useState, useRef } from 'react';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { Mic, MicOff, X } from 'lucide-react';
import { useStore } from '@/lib/store';

interface DictationBubbleProps {
  onClose?: () => void;
}

export function DictationBubble({ onClose }: DictationBubbleProps) {
  const { isSupported, isListening, isPaused, transcript, interimTranscript, error, start, stop, resume, toggle, clearTranscript } = useSpeechToText();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeFieldInfo, setActiveFieldInfo] = useState<{ nodeId: string; field: string } | null>(null);
  const lastTranscriptRef = useRef('');
  const dictationActive = useStore(state => state.dictationActive);
  const setDictationActive = useStore(state => state.setDictationActive);

  // Sync with store state
  useEffect(() => {
    if (dictationActive && !isListening && !isPaused) {
      start();
    } else if (!dictationActive && (isListening || isPaused)) {
      stop();
    }
  }, [dictationActive, isListening, isPaused, start, stop]);

  // Track the active text field position
  useEffect(() => {
    const updatePosition = () => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)) {
        const rect = el.getBoundingClientRect();
        setPosition({
          top: Math.max(4, rect.top),
          left: Math.max(4, Math.min(window.innerWidth - 60, rect.right + 16)),
        });
        // Try to determine what field this is
        const nodeEl = (el as HTMLElement).closest('[data-node-id]');
        if (nodeEl) {
          const nodeId = nodeEl.getAttribute('data-node-id') || '';
          const isTitle = (el as HTMLElement).classList.contains('node-title') || el.tagName === 'INPUT';
          setActiveFieldInfo({ nodeId, field: isTitle ? 'title' : 'description' });
        } else {
          setActiveFieldInfo(null);
        }
      } else {
        // If nothing is focused and we aren't actively dictating, clear positional link
        // (If we ARE dictating, we might want to keep the bubble floating generically, but the user wants field-specific tracking)
        if (!dictationActive) {
          setPosition(null);
          setActiveFieldInfo(null);
        }
      }
    };
    
    updatePosition();
    const interval = setInterval(updatePosition, 500);
    return () => clearInterval(interval);
  }, [dictationActive]);

  // Insert transcript into the active field
  useEffect(() => {
    if (!transcript) {
      lastTranscriptRef.current = '';
      return;
    }
    if (transcript === lastTranscriptRef.current) return;
    
    let newText = transcript;
    if (transcript.startsWith(lastTranscriptRef.current)) {
      newText = transcript.slice(lastTranscriptRef.current.length).trim();
    }
    lastTranscriptRef.current = transcript;
    
    if (!newText) return;

    // Prioritize Zustand store update if we know it's a Node field (100% reliable)
    if (activeFieldInfo) {
      const store = useStore.getState();
      const node = store.nodes[activeFieldInfo.nodeId];
      if (node) {
        const field = activeFieldInfo.field as 'title' | 'description';
        const current = node[field] || '';
        const space = current && !current.endsWith(' ') ? ' ' : '';
        store.updateNode(activeFieldInfo.nodeId, { [field]: current + space + newText });
      }
    } 
    // Fallback to DOM injection for other text fields (like settings or search)
    else {
      const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        const start = el.selectionStart || el.value.length;
        const end = el.selectionEnd || el.value.length;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);
        const space = before && !before.endsWith(' ') ? ' ' : '';
        const newValue = before + space + newText + after;
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(el, newValue);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        
        const newPos = start + space.length + newText.length;
        el.setSelectionRange(newPos, newPos);
      }
    }
  }, [transcript, activeFieldInfo]);

  if (!isSupported) return null;
  // If dictation isn't active AND we aren't focused on a field, hide entirely
  if (!dictationActive && !position) return null;

  const bubbleStyle = position || { top: 80, left: window.innerWidth / 2 - 80 };

  return (
    <div
      className="fixed z-[200] flex items-center justify-center rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.6)] border transition-all"
      style={{
        top: bubbleStyle.top,
        left: bubbleStyle.left,
        width: 44,
        height: 44,
        background: isPaused 
          ? 'rgba(30, 30, 40, 0.92)' 
          : 'rgba(20, 60, 90, 0.92)',
        backdropFilter: 'blur(16px)',
        borderColor: isPaused 
          ? 'rgba(255,255,255,0.08)' 
          : 'rgba(59, 130, 246, 0.4)',
      }}
    >
      {/* Wrapper to block focus loss */}
      <div 
        className="flex items-center justify-center w-full h-full" 
        onPointerDown={(e) => e.preventDefault()}
      >
        <button 
        onClick={() => {
          if (!dictationActive) setDictationActive(true);
          else if (isPaused) resume();
          else setDictationActive(false);
        }}
        className="relative flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition"
        title={!dictationActive ? 'Start dictation' : isPaused ? 'Resume dictation' : 'Stop dictation'}
      >
        {isListening && !isPaused ? (
          <Mic className="w-5 h-5 text-blue-400 animate-pulse" />
        ) : (
          <MicOff className="w-5 h-5 text-neutral-500" />
        )}
        {isListening && !isPaused && (
          <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
        )}
      </button>
      </div>
    </div>
  );
}
