'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const borderSizeMap = {
  sm: 'border-2',
  md: 'border-[3px]',
  lg: 'border-4',
  xl: 'border-4',
};

export default function LoadingSpinner({
  size = 'md',
  message,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        {/* Outer glow */}
        <div
          className={`absolute inset-0 ${sizeMap[size]} rounded-full bg-purple-500/20 blur-md animate-pulse`}
        />
        {/* Spinner ring */}
        <div
          className={`${sizeMap[size]} ${borderSizeMap[size]} border-gray-700 border-t-purple-500 border-r-cyan-500 rounded-full animate-spin`}
        />
      </div>
      {message && (
        <p className="text-sm text-gray-400 animate-pulse">{message}</p>
      )}
    </div>
  );
}

// Full page loading state
export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Animated logo */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold text-white">V</span>
          </div>
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-purple-600/20 to-cyan-500/20 blur-xl" />
        </div>
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 text-sm font-medium tracking-wide">{message}</p>
      </div>
    </div>
  );
}
