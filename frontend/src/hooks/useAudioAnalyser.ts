import { useEffect, useRef, useState } from 'react';

interface UseAudioAnalyserOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
}

interface UseAudioAnalyserReturn {
  analyser: AnalyserNode | null;
  isInitialized: boolean;
  error: string | null;
}

export function useAudioAnalyser(
  audioElement: HTMLAudioElement | null,
  options: UseAudioAnalyserOptions = {}
): UseAudioAnalyserReturn {
  const {
    fftSize = 128,
    smoothingTimeConstant = 0.8,
    minDecibels = -90,
    maxDecibels = -10,
  } = options;

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioElement || isInitialized) return;

    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      analyser.minDecibels = minDecibels;
      analyser.maxDecibels = maxDecibels;
      analyserRef.current = analyser;

      // Create source from audio element
      const source = audioContext.createMediaElementSource(audioElement);
      sourceRef.current = source;

      // Connect: source -> analyser -> destination
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Web Audio API';
      setError(errorMessage);
      console.error('useAudioAnalyser error:', err);
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioElement, isInitialized, fftSize, smoothingTimeConstant, minDecibels, maxDecibels]);

  return {
    analyser: analyserRef.current,
    isInitialized,
    error,
  };
}
