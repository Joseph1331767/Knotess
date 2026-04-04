'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechToTextState {
  isSupported: boolean;
  isListening: boolean;
  isPaused: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  resume: () => void;
  toggle: () => void;
  clearTranscript: () => void;
}

const SILENCE_TIMEOUT_MS = 4000;

export function useSpeechToText(): SpeechToTextState {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const manualStopRef = useRef(false);
  const interimRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);



  const start = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition not supported');
      return;
    }

    // Stop previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setTranscript(prev => prev + (prev ? ' ' : '') + final.trim());
      }
      setInterimTranscript(interim);
      interimRef.current = interim;
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!manualStopRef.current) {
        // Auto-restart for continuous mode unless manually stopped
        try { recognition.start(); } catch {}
      } else {
        setIsListening(false);
      }
    };

    manualStopRef.current = false;
    setError(null);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (e) {
      setError('Failed to start speech recognition');
    }
  }, []);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    
    // Flush any pending interim speech to final transcript before killing
    if (interimRef.current) {
      const pending = interimRef.current.trim();
      if (pending) {
        setTranscript(prev => prev + (prev ? ' ' : '') + pending);
      }
    }
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    setInterimTranscript('');
    interimRef.current = '';
  }, []);

  const resume = useCallback(() => {
    start();
  }, [start]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    interimRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    isPaused: false, // Legacy fallback
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    resume,
    toggle,
    clearTranscript,
  };
}
