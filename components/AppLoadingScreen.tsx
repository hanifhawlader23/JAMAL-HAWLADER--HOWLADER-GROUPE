
import React from 'react';

export const AppLoadingScreen = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[var(--page-bg)] text-white">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[var(--rose-gold-base)]"></div>
    <p className="mt-4 text-xl">Loading Application...</p>
  </div>
);
