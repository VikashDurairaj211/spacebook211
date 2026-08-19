import React, { useState } from 'react';
import AppRoutes from './routes';
import SpaceBookCopilot from './components/SpaceBookCopilot';
 
export default function App() {
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);

  return (
    <>
      <AppRoutes />
      
      {/* Show the full chat component if open, otherwise show the badge button */}
      {isCopilotOpen ? (
        <SpaceBookCopilot onClose={() => setIsCopilotOpen(false)} />
      ) : (
        <button
          onClick={() => setIsCopilotOpen(true)}
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            background: '#0f6074',
            color: '#fff',
            border: 'none',
            borderRadius: '30px',
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#0d5162';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0f6074';
          }}
        >
          💬 SpaceBook Copilot
        </button>
      )}
    </>
  );
}