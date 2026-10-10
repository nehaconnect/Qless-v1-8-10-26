'use client';

import React from 'react';
import { getActiveTheme } from '@/lib/theme-config';

export const GlobalPastelBackground: React.FC = () => {
  const theme = getActiveTheme();

  if (theme === 'blue') {
    return (
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#F6F8FC]" />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none"
      style={{
        background: 'linear-gradient(135deg, #DFF3E8 0%, #BFEBDD 22%, #FFF5E9 55%, #FFE0C7 100%)',
      }}
    >
      {/* Organic background gradient overlay blobs */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-[#BFEBDD]/40 blur-3xl opacity-70" />
      <div className="absolute top-1/3 left-1/4 w-[650px] h-[650px] rounded-full bg-[#FFF5E9]/80 blur-3xl opacity-90" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full bg-[#FFE0C7]/45 blur-3xl opacity-70" />
      <div className="absolute -bottom-40 right-10 w-[600px] h-[600px] rounded-full bg-[#FFE0C7]/50 blur-3xl opacity-80" />

      {/* SVG Organic wave shapes & Botanical leaf accents */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveMintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BFEBDD" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#DFF3E8" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="wavePeachGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE0C7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFF5E9" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00B894" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#64839A" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Soft flowing wave background path 1 */}
        <path
          d="M -100,550 C 200,450 450,650 700,520 C 950,390 1200,600 1540,480 L 1540,1000 L -100,1000 Z"
          fill="url(#waveMintGrad)"
        />

        {/* Soft flowing wave background path 2 (Peach right wave) */}
        <path
          d="M 400,900 C 650,750 900,820 1200,680 C 1350,610 1480,640 1540,620 L 1540,1000 L 400,1000 Z"
          fill="url(#wavePeachGrad)"
        />

        {/* Decorative subtle dot matrix accents */}
        <circle cx="120" cy="180" r="3" fill="#00B894" opacity="0.35" />
        <circle cx="145" cy="210" r="2" fill="#00B894" opacity="0.25" />
        <circle cx="105" cy="235" r="4" fill="#64839A" opacity="0.2" />
        <circle cx="1320" cy="240" r="3.5" fill="#2B7BFF" opacity="0.25" />
        <circle cx="1350" cy="270" r="2" fill="#FFE0C7" opacity="0.5" />
      </svg>

      {/* Bottom Left Botanical Leaf Accent Overlay */}
      <div className="absolute bottom-0 left-0 w-80 h-80 opacity-70 pointer-events-none">
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {/* Main leaf stem */}
          <path
            d="M 20 280 Q 80 200 160 120 T 260 20"
            fill="none"
            stroke="#00B894"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.4"
          />
          {/* Leaf pair 1 */}
          <path
            d="M 60 220 C 40 190 20 180 30 165 C 45 155 70 175 80 200 Z"
            fill="url(#leafGrad)"
          />
          <path
            d="M 75 205 C 105 190 120 175 110 160 C 95 150 75 170 65 195 Z"
            fill="url(#leafGrad)"
          />
          {/* Leaf pair 2 */}
          <path
            d="M 110 170 C 90 140 70 130 80 115 C 95 105 120 125 130 150 Z"
            fill="url(#leafGrad)"
          />
          <path
            d="M 125 155 C 155 140 170 125 160 110 C 145 100 125 120 115 145 Z"
            fill="url(#leafGrad)"
          />
          {/* Leaf pair 3 */}
          <path
            d="M 160 120 C 140 90 120 80 130 65 C 145 55 170 75 180 100 Z"
            fill="url(#leafGrad)"
          />
          <path
            d="M 175 105 C 205 90 220 75 210 60 C 195 50 175 70 165 95 Z"
            fill="url(#leafGrad)"
          />
        </svg>
      </div>

      {/* Bottom Right Botanical Leaf Accent Overlay */}
      <div className="absolute bottom-0 right-0 w-80 h-80 opacity-55 pointer-events-none transform -scale-x-100">
        <svg viewBox="0 0 300 300" className="w-full h-full">
          <path
            d="M 20 280 Q 80 200 160 120 T 250 30"
            fill="none"
            stroke="#00B894"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M 70 210 C 50 180 30 170 40 155 C 55 145 80 165 90 190 Z"
            fill="url(#leafGrad)"
          />
          <path
            d="M 120 160 C 100 130 80 120 90 105 C 105 95 130 115 140 140 Z"
            fill="url(#leafGrad)"
          />
        </svg>
      </div>
    </div>
  );
};
