import React from 'react';

export default function SpaceBookCopilot({ onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        width: '400px',
        height: '600px',
        zIndex: 9999,
        background: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        isolation: 'isolate', // Isolates layering so the iframe can't steal header mouse clicks
      }}
    >
      {/* Copilot Header */}
      <div
        style={{
          height: '62px',
          minHeight: '62px',
          background: '#0f6074',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 50, // Ensures header sits safely above the iframe
        }}
      >
        <span
          style={{
            fontSize: '20px',
            fontWeight: '700',
          }}
        >
          SpaceBook Copilot
        </span>

        <button
          type="button"
          onClick={() => {
            console.log("Close button clicked successfully!");
            if (onClose) onClose();
          }}
          aria-label="Close Copilot"
          style={{
            width: '34px',
            height: '34px',
            border: 'none',
            background: 'transparent',
            color: '#fff',
            fontSize: '28px',
            lineHeight: '1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ×
        </button>
      </div>

      {/* Microsoft Copilot */}
      <iframe
        src="https://copilotstudio.microsoft.com/environments/Default-13085c86-4bcb-460a-a6f0-b373421c6323/bots/crc1d_spacebookcopilot_ZlMFY3/webchat?__version__=2&enableFileAttachment=false&cliAgent=true"
        title="SpaceBook Copilot"
        frameBorder="0"
        style={{
          width: '100%',
          flex: 1,
          border: '0',
        }}
        allow="microphone"
      />
    </div>
  );
}