"use client";

import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  animate?: boolean;
}

export const Sparkline = ({ 
  data, 
  color = "var(--primary)", 
  width = 100, 
  height = 40, 
  strokeWidth = 2,
  animate = true
}: SparklineProps) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const pathData = `M ${points.split(' ')[0]} L ${points.split(' ').slice(1).join(' L ')}`;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'visible' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`gradient-${color.replace(/[^\w]/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path
          d={`${pathData} L ${width},${height} L 0,${height} Z`}
          fill={`url(#gradient-${color.replace(/[^\w]/g, '')})`}
          style={{
            opacity: animate ? 0 : 1,
            animation: animate ? 'fadeIn 1s ease-out 0.5s forwards' : 'none'
          }}
        />

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 200,
            strokeDashoffset: animate ? 200 : 0,
            animation: animate ? 'drawPath 1.5s ease-out forwards' : 'none'
          }}
        />
      </svg>

      <style jsx>{`
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
