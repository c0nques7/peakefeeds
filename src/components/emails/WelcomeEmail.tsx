import * as React from 'react';

interface WelcomeEmailProps {
  userEmail: string;
}

// 🛑 CRITICAL: This function must NOT be 'async'
export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ userEmail }) => (
  <div style={{ fontFamily: 'sans-serif', color: '#333', padding: '20px' }}>
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      
      <div style={{ borderBottom: '2px solid #7059C8', paddingBottom: '20px', marginBottom: '30px' }}>
        <h2 style={{ color: '#7059C8', margin: 0 }}>Peake Feeds</h2>
        <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0' }}>The Truth Layer</p>
      </div>

      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Welcome, and thank you for your interest. We're very excited to show you what we've been working on.
      </h1>
      
      <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
        You have successfully secured your spot on the waitlist.
      </p>
      
      <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
        We will reach out soon with your invite code.
      </p>

      <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', fontSize: '12px', color: '#888' }}>
        <p>Sent to {userEmail}</p>
        <p>Peake Feeds • Secured by Ethereum</p>
      </div>
      
    </div>
  </div>
);
