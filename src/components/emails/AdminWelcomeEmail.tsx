import * as React from 'react';

interface AdminWelcomeEmailProps {
  username: string;
  password: string;
  loginLink: string;
}

export const AdminWelcomeEmail: React.FC<AdminWelcomeEmailProps> = ({ username, password, loginLink }) => (
  <div style={{ fontFamily: 'sans-serif', color: '#333', padding: '20px' }}>
    <div style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid #eee', borderRadius: '10px', padding: '20px' }}>
      <div style={{ borderBottom: '2px solid #7059C8', paddingBottom: '20px', marginBottom: '30px' }}>
        <h2 style={{ color: '#7059C8', margin: 0 }}>Peake Feeds</h2>
        <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0' }}>Internal Team Access</p>
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Welcome to the team.</h1>
      <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>An administrator account has been created for you manually.</p>
      <div style={{ background: '#F3F4F6', borderRadius: '8px', padding: '20px', marginBottom: '30px', border: '1px solid #eee' }}>
        <p style={{ margin: '0 0 10px 0' }}><strong>Username:</strong> {username}</p>
        <p style={{ margin: '0' }}><strong>Temporary Password:</strong> {password}</p>
      </div>
      <div style={{ marginBottom: '30px' }}>
        <a href={loginLink} style={{ backgroundColor: '#7059C8', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>Log In to Dashboard</a>
      </div>
    </div>
  </div>
);