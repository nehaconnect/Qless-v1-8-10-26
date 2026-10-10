'use client';

import React from 'react';

interface QLessLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const QLessLogo: React.FC<QLessLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }[size];

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Clock-and-Q Brand Motif SVG Icon */}
      <div className={`relative ${iconDimensions} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Q Circle with Tail */}
          <circle
            cx="48"
            cy="48"
            r="38"
            stroke="#073653"
            strokeWidth="11"
            strokeLinecap="round"
          />
          {/* Q Tail */}
          <path
            d="M 64 64 L 84 84"
            stroke="#073653"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Clock Timer Tick Marks & Hands */}
          <circle cx="48" cy="48" r="2.5" fill="#00B894" />
          {/* Minute Hand pointing up-right */}
          <path
            d="M 48 48 L 48 24"
            stroke="#00B894"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Hour Hand pointing right */}
          <path
            d="M 48 48 L 64 48"
            stroke="#00B894"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Mint accent arc on top left of Q */}
          <path
            d="M 22 48 A 26 26 0 0 1 48 22"
            stroke="#00B894"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight ${textSizes} text-[#073653] leading-none`}>
            QLess
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-bold text-[#64839A] tracking-wide mt-0.5">
            IP CW • Campus Canteen
          </span>
        )}
      </div>
    </div>
  );
};
