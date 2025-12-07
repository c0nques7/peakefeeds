import * as React from 'react';

interface ActivationEmailProps {
  inviteCode: string;
  registerLink: string;
}

export const ActivationEmail: React.FC<ActivationEmailProps> = ({ inviteCode, registerLink }) => (
  <div style={{ fontFamily: 'sans-serif', color: '#333', padding: '20px' }}>
    <div style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid #eee', borderRadius: '10px', padding: '20px' }}>
      <div style={{ borderBottom: '2px solid #7059C8', paddingBottom: '20px', marginBottom: '30px' }}>
        <h2 style={{ color: '#7059C8', margin: 0 }}>Peake Feeds</h2>
        <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0' }}>Private Beta Access</p>
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>The wait is over.</h1>
      <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
        You have been selected to join the PeakeFeeds private beta.
      </p>
      <div style={{ background: '#F3F4F6', borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '30px', border: '1px solid #eee' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#666', marginBottom: '10px' }}>Your Invite Code</p>
        <p style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 'bold', color: '#7059C8', margin: 0, letterSpacing: '2px' }}>{inviteCode}</p>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <a href={registerLink} style={{ backgroundColor: '#000', color: '#fff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>Create Account</a>
      </div>
    </div>
  </div>
);