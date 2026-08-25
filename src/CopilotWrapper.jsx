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
        <div className="fixed top-[68px] right-6 z-[9999] flex items-center gap-3 select-none pointer-events-auto">
          {/* Floating Invitation / Help Bubble */}
          {showCopilotBubble && (
            <div
              onClick={() => setIsCopilotOpen(true)}
              className="relative group cursor-pointer flex items-start gap-3 bg-white/95 backdrop-blur-md border border-sky-200 text-slate-800 px-4 py-2.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 max-w-[280px] hover:border-sky-400 hover:-translate-x-0.5"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsCopilotOpen(true);
                }
              }}
            >
              {/* Dismiss button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCopilotBubble(false);
                }}
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-400 flex items-center justify-center text-xs shadow-sm transition"
                title="Dismiss message"
                aria-label="Dismiss help message"
              >
                <X size={12} />
              </button>

              {/* Animated Sparkle Avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-sm ring-2 ring-sky-100 mt-0.5">
                <Sparkles size={16} className="animate-pulse" />
              </div>

              {/* Message Content */}
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-semibold text-xs text-sky-950">Aira</span>
                  <span className="flex h-2 w-2 relative" title="Online">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  How can I help you today? <span className="text-sky-700 font-semibold underline decoration-sky-300">Ask our assistant</span>
                </p>
              </div>

              {/* Pointer Tail pointing right to the button */}
              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-t border-r border-sky-200 rotate-45"></div>
            </div>
          )}

          {/* Branded Aira Assistant Button */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="relative flex items-center justify-center w-13 h-13 rounded-full bg-gradient-to-tr from-sky-700 via-sky-600 to-sky-500 text-white shadow-lg shadow-sky-600/30 hover:shadow-xl hover:shadow-sky-500/40 hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white focus:outline-none focus:ring-4 focus:ring-sky-200 group flex-shrink-0"
            style={{ width: '52px', height: '52px' }}
            title="Aira Assistant - Ask doubts or get help"
            aria-label="Open Aira Assistant"
          >
            {/* Inner container with Logo */}
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/95 shadow-inner p-1">
              <img
                src="/Logo.png"
                alt="Aira Assistant"
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>

            {/* Sparkle AI Badge */}
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-md border-2 border-white">
              <Sparkles size={11} className="fill-amber-950" />
            </span>
          </button>
        </div>
      )}
    </>
  );
}