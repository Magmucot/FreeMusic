import { useEffect, useRef } from 'react';
import { audioAnalyzer } from '@/lib/audioAnalyzer';

interface AudioSpectrogramProps {
  audioElement: HTMLAudioElement | null;
  isPlaying?: boolean;
  barCount?: number;
  barColor?: string;
  barGap?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
  className?: string;
  height?: number;
  mirror?: boolean;
  roundedBars?: boolean;
  gradient?: boolean;
}

export function AudioSpectrogram({
  audioElement,
  isPlaying = false,
  barCount = 64,
  barColor = '#3b82f6',
  barGap = 2,
  smoothingTimeConstant = 0.8,
  minDecibels = -90,
  maxDecibels = -10,
  className = '',
  height = 200,
  mirror = true,
  roundedBars = true,
  gradient = true,
}: AudioSpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAnalyser = async () => {
      if (!isPlaying || !audioElement) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = undefined;
        }
        return;
      }

      try {
        const analyser = await audioAnalyzer.getAnalyser(audioElement, {
          fftSize: Math.max(barCount * 4, 256),
          smoothingTimeConstant,
          minDecibels,
          maxDecibels,
        });

        if (!isMounted || !analyser || !canvasRef.current) return;

        analyserRef.current = analyser;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const createGradient = (barHeight: number, baseColor: string): CanvasGradient => {
          const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);

          const color = baseColor.startsWith('#') ? baseColor : '#3b82f6';
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);

          grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
          grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.7)`);
          grad.addColorStop(1, `rgba(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)}, 1)`);

          return grad;
        };

        const draw = () => {
          if (!isMounted) return;
          animationRef.current = requestAnimationFrame(draw);

          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barWidth = (canvas.width - (barCount - 1) * barGap) / barCount;
          const centerY = mirror ? canvas.height / 2 : canvas.height;

          for (let i = 0; i < barCount; i++) {
            const value = dataArray[i];
            const normalizedValue = value / 255;
            const maxHeight = mirror ? canvas.height / 2 : canvas.height;
            const barHeight = normalizedValue * maxHeight;
            const x = i * (barWidth + barGap);

            if (barHeight < 1) continue;

            const fillColor = gradient ? createGradient(barHeight, barColor) : barColor;
            ctx.fillStyle = fillColor;

            if (roundedBars) {
              const radius = Math.min(barWidth / 2, barHeight / 2, 3);

              if (mirror) {
                ctx.beginPath();
                ctx.roundRect(x, centerY - barHeight, barWidth, barHeight, [radius, radius, 0, 0]);
                ctx.fill();

                ctx.beginPath();
                ctx.roundRect(x, centerY, barWidth, barHeight, [0, 0, radius, radius]);
                ctx.fill();
              } else {
                ctx.beginPath();
                ctx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, [radius, radius, 0, 0]);
                ctx.fill();
              }
            } else {
              if (mirror) {
                ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
                ctx.fillRect(x, centerY, barWidth, barHeight);
              } else {
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
              }
            }
          }
        };

        draw();
      } catch (error) {
        console.error('Failed to initialize spectrogram:', error);
      }
    };

    initAnalyser();

    return () => {
      isMounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [isPlaying, audioElement, barCount, barColor, barGap, smoothingTimeConstant, minDecibels, maxDecibels, mirror, roundedBars, gradient]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  );
}
