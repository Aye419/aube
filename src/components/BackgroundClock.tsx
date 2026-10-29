import React, { useEffect, useState } from 'react';

interface BackgroundClockProps {
  variant?: 'light' | 'dark';
}

export const BackgroundClock: React.FC<BackgroundClockProps> = ({ variant = 'light' }) => {
  const [time, setTime] = useState<Date>(() => new Date());

  useEffect(() => {
    let rafId = 0;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      const interval = window.setInterval(() => setTime(new Date()), 1000);
      return () => window.clearInterval(interval);
    }

    const update = () => {
      setTime(new Date());
      rafId = window.requestAnimationFrame(update);
    };
    rafId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const ms = time.getMilliseconds();
  const seconds = time.getSeconds() + ms / 1000;
  const minutes = time.getMinutes() + seconds / 60;
  const hours = (time.getHours() % 12) + minutes / 60;

  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6;
  const hourAngle = hours * 30;

  const isDark = variant === 'dark';
  const strokePrimary = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(10, 10, 10, 0.16)';
  const strokeMuted = isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(10, 10, 10, 0.07)';
  const handColor = isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(10, 10, 10, 0.18)';
  const redAccent = isDark ? 'rgba(220, 38, 38, 0.48)' : 'rgba(220, 38, 38, 0.38)';

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const isMajor = i % 5 === 0;
    const isQuarter = i % 15 === 0;
    const angle = i * 6;
    return { index: i, angle, isMajor, isQuarter };
  });

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Subtle radial framing vignette so the Swiss dial anchors the viewport */}
      <div
        className={
          isDark
            ? 'absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.06)_0%,rgba(0,0,0,0)_68%)]'
            : 'absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(10,10,10,0.02)_0%,rgba(10,10,10,0.05)_100%)]'
        }
      />

      <svg
        viewBox="-500 -500 1000 1000"
        className="w-[115vmin] h-[115vmin] min-w-[680px] min-h-[680px] max-w-[1280px] max-h-[1280px] shrink-0"
      >
        {/* Outer Precision Bezel Rings */}
        <circle
          cx="0"
          cy="0"
          r="476"
          fill="none"
          stroke={strokeMuted}
          strokeWidth="1.5"
        />
        <circle
          cx="0"
          cy="0"
          r="460"
          fill="none"
          stroke={strokePrimary}
          strokeWidth="2.5"
        />
        <circle
          cx="0"
          cy="0"
          r="355"
          fill="none"
          stroke={strokeMuted}
          strokeWidth="1"
          strokeDasharray="4 8"
        />
        <circle
          cx="0"
          cy="0"
          r="190"
          fill="none"
          stroke={strokeMuted}
          strokeWidth="1"
        />

        {/* Subtle Architectural Crosshairs */}
        <line x1="-460" y1="0" x2="-380" y2="0" stroke={strokeMuted} strokeWidth="1" />
        <line x1="380" y1="0" x2="460" y2="0" stroke={strokeMuted} strokeWidth="1" />
        <line x1="0" y1="-460" x2="0" y2="-380" stroke={strokeMuted} strokeWidth="1" />
        <line x1="0" y1="380" x2="0" y2="460" stroke={strokeMuted} strokeWidth="1" />

        {/* 60 Swiss Railway Dial Indices */}
        {ticks.map(({ index, angle, isMajor, isQuarter }) => (
          <g key={index} transform={`rotate(${angle})`}>
            {isQuarter ? (
              <rect
                x="-5"
                y="-444"
                width="10"
                height="48"
                rx="2"
                fill={index === 0 ? redAccent : strokePrimary}
              />
            ) : isMajor ? (
              <rect
                x="-3.5"
                y="-444"
                width="7"
                height="36"
                rx="1.5"
                fill={strokePrimary}
              />
            ) : (
              <line
                x1="0"
                y1="-444"
                x2="0"
                y2="-428"
                stroke={strokeMuted}
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </g>
        ))}

        {/* Hour Hand */}
        <g transform={`rotate(${hourAngle})`}>
          <rect
            x="-9"
            y="-255"
            width="18"
            height="320"
            rx="4"
            fill={handColor}
          />
        </g>

        {/* Minute Hand */}
        <g transform={`rotate(${minuteAngle})`}>
          <rect
            x="-6"
            y="-385"
            width="12"
            height="465"
            rx="3"
            fill={handColor}
          />
        </g>

        {/* Iconic Swiss Red Lollipop Sweeping Second Hand */}
        <g transform={`rotate(${secondAngle})`}>
          <line
            x1="0"
            y1="105"
            x2="0"
            y2="-372"
            stroke={redAccent}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="0" cy="-372" r="14" fill={redAccent} />
          <circle cx="0" cy="0" r="9" fill={redAccent} />
        </g>

        {/* Center Cap Pin */}
        <circle
          cx="0"
          cy="0"
          r="4"
          fill={isDark ? '#000000' : '#FFFFFF'}
        />
      </svg>
    </div>
  );
};
