import React, { useEffect, useRef } from 'react';
import { musicEngine } from '../audio/dailyMusicEngine';

interface AudioVisualizerProps {
  active: boolean;
  height?: number;
  barCount?: number;
  surface?: 'dark' | 'light';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  active,
  height = 36,
  barCount = 28,
  surface = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const dataArray = new Uint8Array(64);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (
        canvas.width !== Math.floor(rect.width * dpr) ||
        canvas.height !== Math.floor(rect.height * dpr)
      ) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const analyser = musicEngine.getAnalyser();
      if (active && analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        dataArray.fill(0);
      }

      const gap = 4;
      const totalGap = gap * (barCount - 1);
      const barWidth = Math.max(2, (rect.width - totalGap) / barCount);

      for (let i = 0; i < barCount; i++) {
        const binIndex = Math.min(dataArray.length - 1, Math.floor((i / barCount) * 28) + 1);
        const value = active ? dataArray[binIndex] / 255 : 0;
        const minBarHeight = 3;
        const barH = Math.max(minBarHeight, value * (rect.height - 4));
        const x = i * (barWidth + gap);
        const y = (rect.height - barH) / 2;

        if (active && value > 0.04) {
          ctx.fillStyle = `rgba(220, 38, 38, ${0.55 + value * 0.45})`;
        } else {
          ctx.fillStyle =
            surface === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(10, 10, 10, 0.14)';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 1.5);
        ctx.fill();
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [active, barCount, surface]);

  return (
    <canvas
      ref={canvasRef}
      style={{ height: `${height}px` }}
      className="w-full block"
      aria-hidden="true"
    />
  );
};
