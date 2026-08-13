import React from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  className = "",
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <h3 className="font-display text-lg font-bold text-ink">
            {title}
          </h3>

          {onClose && (
            <button
              type="button"
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
    </div>,
    document.body
  );
}