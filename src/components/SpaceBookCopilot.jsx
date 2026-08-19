import React from 'react';
export default function SpaceBookCopilot() {
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
      }}
>
<iframe
        src="https://copilotstudio.microsoft.com/environments/Default-13085c86-4bcb-460a-a6f0-b373421c6323/bots/crc1d_spacebookcopilot_ZlMFY3/webchat?__version__=2&enableFileAttachment=false&cliAgent=true"
        title="SpaceBook Copilot"
        frameBorder="0"
        style={{
          width: '100%',
          height: '100%',
          border: '0',
        }}
        allow="microphone"
      />
</div>
  )
}