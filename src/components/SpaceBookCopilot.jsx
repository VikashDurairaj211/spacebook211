import { X } from 'lucide-react';

export default function SpaceBookCopilot({ isOpen = false, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        right: '24px',
        top: '68px',
        width: '400px',
        height: 'calc(100vh - 88px)',
        maxHeight: '640px',
        zIndex: isOpen ? 9999 : -1,
        background: '#fff',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: isOpen ? '0 12px 40px rgba(0, 0, 0, 0.22)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        opacity: isOpen ? 1 : 0.0001,
        pointerEvents: isOpen ? 'auto' : 'none',
        visibility: 'visible',
        transform: isOpen ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 8px, 0) scale(0.97)',
        transformOrigin: 'top right',
        transition: 'opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid rgba(2, 132, 199, 0.15)',
      }}
    >
      {/* =================================================
          CUSTOM NATIVE AIRA HEADER
          Permanently fixed at the top so Microsoft's raw
          "Chat" title bar is completely covered and never flickers!
      ================================================= */}
      <div
        style={{
          height: '52px',
          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          color: '#fff',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Logo badge */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
            }}
          >
            <img
              src="/Logo.png"
              alt="Aira Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.01em' }}>
              Aira Assistant
            </span>
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 6px #10B981',
              }}
              title="Online"
            />
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            if (onClose) onClose();
          }}
          aria-label="Close Aira"
          style={{
            width: '28px',
            height: '28px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* =================================================
          IFRAME CHAT CONTAINER (OFFSET TO HIDE RAW MS HEADER)
      ================================================= */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        {/* Microsoft Copilot Iframe - Always mounted and preloaded with no artificial delay */}
        <iframe
          src="https://copilotstudio.microsoft.com/environments/Default-13085c86-4bcb-460a-a6f0-b373421c6323/bots/crc1d_officeroomassistant_gSlTyn/webchat?__version__=2&enableFileAttachment=false&cliAgent=true"
          title="Aira Assistant"
          frameBorder="0"
          loading="eager"
          style={{
            position: 'absolute',
            top: '-50px',
            left: 0,
            width: '100%',
            height: 'calc(100% + 50px)',
            border: '0',
          }}
          allow="microphone"
        />
      </div>
    </div>
  );
}