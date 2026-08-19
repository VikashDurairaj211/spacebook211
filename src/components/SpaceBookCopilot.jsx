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
      }}
    >
      {/* Custom Close Button overlayed precisely on top of the iframe's header */}
      <button
        type="button"
        onClick={() => {
          if (onClose) onClose();
        }}
        aria-label="Close Copilot"
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          width: '32px',
          height: '32px',
          border: 'none',
          background: 'rgba(255, 255, 255, 0.2)',
          color: '#fff',
          fontSize: '20px',
          lineHeight: '1',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          zIndex: 100, // Keeps it on top of the iframe
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        ×
      </button>

      {/* Microsoft Copilot Iframe */}
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