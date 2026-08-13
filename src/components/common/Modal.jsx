import React from "react";

export default function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  className = "",
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-[600px] max-w-[calc(100vw-2rem)] h-auto rounded-2xl bg-white p-6 shadow-xl ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <h3 className="font-display text-lg font-bold text-ink">
            {title}
          </h3>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate hover:bg-portal-bg hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}