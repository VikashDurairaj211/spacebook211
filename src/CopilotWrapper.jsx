import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import SpaceBookCopilot from './components/SpaceBookCopilot';

export default function CopilotWrapper() {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [showCopilotBubble, setShowCopilotBubble] = useState(true);
  const location = useLocation();

  // Define paths where the copilot should NOT appear
  const hideOnPaths = ['/login', '/signup', '/'];
  const shouldHideCopilot = hideOnPaths.includes(location.pathname);

  if (shouldHideCopilot) {
    return null; // Don't render anything on login/signup/home
  }

  return (
    <>
      <SpaceBookCopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
      {!isCopilotOpen && (
        <div className="fixed top-[60px] right-3 z-[9999] flex items-center gap-2 select-none pointer-events-auto">
          {/* Ultra-compact Sleek Help Bubble */}
          {showCopilotBubble && (
            <div
              onClick={() => setIsCopilotOpen(true)}
              className="relative group cursor-pointer flex items-center gap-2 bg-white/95 backdrop-blur-md border border-sky-200 text-slate-800 px-2.5 py-1.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:border-sky-400 hover:-translate-x-0.5"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsCopilotOpen(true);
                }
              }}
            >
              {/* Compact Dismiss button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCopilotBubble(false);
                }}
                className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-400 flex items-center justify-center shadow-xs transition"
                title="Dismiss message"
                aria-label="Dismiss help message"
              >
                <X size={10} />
              </button>

              {/* Animated Sparkle Icon */}
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-xs">
                <Sparkles size={11} className="animate-pulse" />
              </div>

              {/* Message Content */}
              <div className="flex flex-col text-left pr-0.5">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[11px] text-sky-950 leading-tight">Aira</span>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] text-sky-700 font-medium leading-tight whitespace-nowrap">Ask assistant</span>
              </div>

              {/* Pointer Tail pointing right to the button */}
              <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-t border-r border-sky-200 rotate-45"></div>
            </div>
          )}

          {/* Compact Branded Aira Assistant Button */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="relative flex items-center justify-center rounded-full bg-gradient-to-tr from-sky-700 via-sky-600 to-sky-500 text-white shadow-md shadow-sky-600/30 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white focus:outline-none focus:ring-2 focus:ring-sky-200 group flex-shrink-0"
            style={{ width: '42px', height: '42px' }}
            title="Aira Assistant - Ask doubts or get help"
            aria-label="Open Aira Assistant"
          >
            {/* Inner container with Logo */}
            <div className="flex items-center justify-center w-7.5 h-7.5 rounded-full bg-white/95 shadow-inner p-0.5">
              <img
                src="/Logo.png"
                alt="Aira Assistant"
                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>

            {/* Sparkle AI Badge */}
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-sm border border-white">
              <Sparkles size={9} className="fill-amber-950" />
            </span>
          </button>
        </div>
      )}
    </>
  );
}