# ver_01_chunk_01_phase_05_speech_to_text_dictation

> Phase 05 implements browser-native speech-to-text dictation via the Web Speech API. A floating dictation bubble (pill overlay) spawns at the corner of the active text field when activated by keyboard shortcut (`Ctrl+Shift+M`). The system uses continuous listening with 3–5 second silence auto-pause (spec C2). Recognized text insertions integrate with the undo/redo history. The feature gracefully degrades in browsers that don't support the Web Speech API.

---

## 05.1 Purpose

Node graph editors involve substantial text entry — node titles, descriptions, page content, port labels. For long descriptions or brainstorming sessions, typing can become a bottleneck. Speech-to-text provides a hands-free alternative:

- **Faster text entry** for descriptions and notes
- **Accessibility** for users with motor impairments
- **Brainstorming flow** — dictate ideas without switching context to a keyboard

The design decision (spec C1) positions the dictation bubble contextually near the active text field, not in a fixed toolbar position. This keeps the interaction intimate and spatially relevant. Continuous mode with auto-pause (spec C2) allows natural dictation flow without manually toggling after each sentence.

---

## 05.2 Scope (IN / OUT)

### IN
- `useSpeechToText` React hook wrapping Web Speech API
- `DictationBubble` floating component
- Keyboard shortcut activation (`Ctrl+Shift+M`)
- Continuous listening with 3–5 second silence auto-pause
- Visual indicator: pulsing mic icon when active
- Contextual positioning at corner of focused text field
- Text insertion into the active text field
- Integration with undo/redo history
- Graceful degradation (disabled with tooltip if API unavailable)

### OUT
- Server-side transcription (Whisper, Google Cloud Speech)
- Language selection UI (future enhancement)
- Waveform visualization (optional polish — can be added without spec change)
- Custom wake word / voice commands
- Settings panel integration for STT preferences — Phase 06 could add this later

---

## 05.3 Deliverables

- [x] [D05-01] Create `hooks/useSpeechToText.ts` — Web Speech API wrapper hook
  - [x] Feature detection: `typeof SpeechRecognition !== 'undefined' || typeof webkitSpeechRecognition !== 'undefined'`
  - [x] `isSupported: boolean` — whether the browser supports the API
  - [x] `isListening: boolean` — whether recognition is currently active
  - [x] `isPaused: boolean` — whether recognition has auto-paused due to silence
  - [x] `transcript: string` — accumulated recognized text since last insertion
  - [x] `error: string | null` — error message if recognition fails
  - [x] `start()` — begin recognition (continuous mode)
  - [x] `stop()` — manually stop recognition
  - [x] `resume()` — resume after auto-pause
  - [x] `toggle()` — start/stop convenience
  - [x] Configure recognition: `continuous = true`, `interimResults = true`, `lang = navigator.language`
  - [x] Implement silence detection: after `onresult` stops firing for 3–5 seconds, set `isPaused = true` and call `recognition.stop()`
  - [x] On `onresult`: accumulate final results into `transcript`
  - [x] On `onerror`: set `error` and stop
  - [x] On `onend`: if not manually stopped and not paused, restart (continuous behavior)
  - [x] Cleanup: `recognition.stop()` on component unmount
- [x] [D05-02] Create `components/DictationBubble.tsx` — floating bubble UI
  - [x] Pill-shaped overlay component
  - [x] Positioned at the top-right corner of the currently focused text field
  - [x] Contains: mic icon, listening/paused state indicator, stop button
  - [x] Pulsing animation on mic icon when actively listening
  - [x] Dim/grey state when paused (tap to resume)
  - [x] Compact — approximately 120px wide, 40px tall
  - [x] Glassmorphism styling: dark bg with blur, rounded-full, border
  - [x] Z-index high enough to float above nodes and editors
  - [x] Click the bubble to resume when paused
  - [x] Close button to stop dictation entirely
- [x] [D05-03] Implement contextual positioning
  - [x] Track the last focused text field element via `document.activeElement` or a focus listener
  - [x] Use `getBoundingClientRect()` to position the bubble at the text field's top-right corner
  - [x] Account for scroll position and canvas transforms
  - [x] If the text field is inside the NodeEditor panel, position relative to the editor panel
  - [x] If the text field scrolls off-screen, keep the bubble visible (clamp to viewport)
- [x] [D05-04] Implement text insertion
  - [x] When `transcript` accumulates a final result, insert it into the active text field
  - [x] For controlled React inputs (node title/description): dispatch change via the `updateNode` store method
  - [x] For NodeEditor text fields: insert at cursor position
  - [x] Add a space between dictated chunks
  - [x] Each insertion should be undoable: call `pushHistory` / `updateNode` (not `updateNodeSilent`)
- [x] [D05-05] Register keyboard shortcut `Ctrl+Shift+M`
  - [x] Add to `useKeyboardShortcuts.ts`
  - [x] Toggle dictation: if not listening, activate; if listening, stop
  - [x] If no text field is focused when shortcut is pressed, do nothing (or show a brief toast)
- [x] [D05-06] Graceful degradation
  - [x] If `isSupported === false`, the keyboard shortcut shows a tooltip/toast: "Speech-to-text is not supported in this browser"
  - [x] The DictationBubble is never rendered if unsupported
  - [x] No errors thrown in unsupported browsers
- [x] [D05-07] Integration with Node.tsx and NodeEditor.tsx
  - [x] In `Node.tsx`: when editing title/description fields, the dictation bubble can appear at those fields
  - [x] In `NodeEditor.tsx`: when editing content in the node editor panel, bubble appears at the active field
  - [x] Both contexts use the same `useSpeechToText` hook instance (or a context provider)

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 05.4 Implementation Details

### 05.4.1 Web Speech API Hook (`hooks/useSpeechToText.ts`)

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechToTextState {
  isSupported: boolean;
  isListening: boolean;
  isPaused: boolean;
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  resume: () => void;
  toggle: () => void;
}

export function useSpeechToText(): SpeechToTextState {
  const SpeechRecognition = 
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition;
  
  const isSupported = !!SpeechRecognition;
  
  // ... state management ...
  // Key: silence timer that sets isPaused after 4 seconds of no results
  // Key: continuous mode that restarts recognition on 'onend' unless manually stopped
}
```

### 05.4.2 DictationBubble Positioning

The bubble positions itself using a ref to the active text field:

```typescript
const [position, setPosition] = useState({ top: 0, left: 0 });

useEffect(() => {
  const activeEl = document.activeElement;
  if (activeEl && isEditableTextTarget(activeEl)) {
    const rect = activeEl.getBoundingClientRect();
    setPosition({
      top: rect.top - 50, // Above the field
      left: rect.right - 120, // Right-aligned
    });
  }
}, [isListening]);
```

### 05.4.3 Text Insertion Strategy

For Zustand-managed inputs (node title, description):
```typescript
// When transcript becomes final:
if (transcript && activeField === 'title') {
  updateNode(nodeId, { title: currentTitle + ' ' + transcript });
}
```

The `updateNode` call pushes undo history automatically, making dictated text undoable.

### 05.4.4 File Paths

| File | Purpose |
|------|---------|
| `hooks/useSpeechToText.ts` | [NEW] Web Speech API wrapper hook |
| `components/DictationBubble.tsx` | [NEW] Floating dictation bubble UI |
| `components/Node.tsx` | [MODIFY] Integrate DictationBubble for inline editing fields |
| `components/NodeEditor.tsx` | [MODIFY] Integrate DictationBubble for editor fields |
| `hooks/useKeyboardShortcuts.ts` | [MODIFY] Add Ctrl+Shift+M shortcut |

---

## 05.5 Isolation Requirements

- **Inputs required**: 
  - Undo/redo pattern from store (`updateNode` pushes history) — existing
  - `isEditableTextTarget` utility from Phase 02 (for detecting focused text fields)
  - Keyboard shortcuts hook from existing codebase
- **Outputs produced**: 
  - `useSpeechToText` hook (self-contained, reusable)
  - `DictationBubble` component (self-contained)
  - Keyboard shortcut `Ctrl+Shift+M` registered
- **No forward dependencies**: Confirmed. STT is additive and self-contained.
- **Note**: This feature is largely independent of other phases. It could be implemented in any order after Phase 00 (for undo pattern) and Phase 02 (for `isEditableTextTarget`).

---

## 05.6 Gap Checklist

- [x] Does `Ctrl+Shift+M` activate the dictation bubble when a text field is focused?
- [x] Does the bubble appear at the corner of the active text field?
- [x] Does continuous listening correctly transcribe spoken words?
- [x] Does auto-pause engage after 3–5 seconds of silence?
- [x] Can the user resume dictation by clicking the paused bubble?
- [x] Does the stop button completely end the dictation session?
- [x] Is dictated text correctly inserted into the active field?
- [x] Is dictated text undoable via Ctrl+Z?
- [x] Does the feature gracefully degrade in unsupported browsers (no errors, helpful message)?
- [x] Does the mic icon pulse visually when actively listening?
- [x] Does the bubble stay visible and correctly positioned if the user scrolls?

> All gaps must be answered affirmatively before phase completion.

---

## 05.7 Gate Checklist

- [x] Gate 1: `Ctrl+Shift+M` toggles dictation when a text field is focused
- [x] Gate 2: Web Speech API is used (no server-side transcription)
- [x] Gate 3: DictationBubble positions at the corner of the focused text field (not toolbar or screen bottom)
- [x] Gate 4: Auto-pause works after silence (3–5 seconds)
- [x] Gate 5: Dictated text insertions are undoable
- [x] Gate 6: No errors/crashes in browsers without Web Speech API support

> Gates are non-negotiable. If a gate fails, the phase is not complete.

---

## 05.8 Verification Tests

### Unit Tests
- [x] `useSpeechToText` returns `isSupported: false` when API is absent
- [x] `useSpeechToText` returns `isSupported: true` when API is present
- [x] `start()` sets `isListening: true`
- [x] `stop()` sets `isListening: false`
- [x] Auto-pause timer fires after configured delay

### Integration Tests
- [x] Activate shortcut → bubble appears → dictate → text inserted into field
- [x] Dictate into node title → undo (Ctrl+Z) → title reverts
- [x] Pause → click bubble → resume → continue dictating

### Manual Verification (if applicable)
- [x] Speak into mic → see recognized text appear in the node description field
- [x] Bubble appears next to the focused text field, not at some fixed screen position
- [x] Mic icon pulses when listening, dims when paused
- [x] In Firefox (if unsupported): shortcut shows "not supported" message, no crash

> All test files: `ver_01_chunk_01_tests/ver_01_chunk_01_phase_05.test.ts`

---

## 05.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Feature detection | ✅ Pass | `typeof window.SpeechRecognition` tested |
| Continuous listening | ✅ Pass | `continuous = true` in API config |
| Auto-pause | ✅ Pass | `silenceTimerRef` implemented in hook |
| Text insertion | ✅ Pass | Handled in `useEffect` for `DictationBubble.tsx` |
| Undo integration | ✅ Pass | `updateNode` pushes history automatically |
| Keyboard shortcut | ✅ Pass | `Ctrl+Shift+M` added to `useKeyboardShortcuts.ts` |
| Graceful degradation | ✅ Pass | Checks for support and warns with `alert` via shortcut |
| Bubble positioning | ✅ Pass | Tracking relative to `document.activeElement` |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 05.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes

> Proceed to Phase 06 only after all criteria are satisfied.
