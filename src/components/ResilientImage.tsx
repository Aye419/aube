import React, { useState } from 'react';
import { Music } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  fallbackTitle?: string;
  className?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  fallbackTitle,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/40 text-slate-300 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Music className="w-7 h-7 text-amber-400/80 mb-2" />
        {fallbackTitle && (
          <span className="font-editorial text-sm text-slate-200">{fallbackTitle}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
