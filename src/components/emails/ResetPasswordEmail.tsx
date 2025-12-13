import * as React from 'react';

interface ResetPasswordEmailProps {
  userEmail: string;
  resetLink: string;
}

// Keep this synchronous (do not make it async)
export const ResetPasswordEmail: React.FC<ResetPasswordEmailProps> = ({ userEmail, resetLink }) => (
  <div style={{ fontFamily: 'sans-serif', color: '#333', padding: '20px' }}>
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>

      <div style={{ borderBottom: '2px solid #7059C8', paddingBottom: '20px', marginBottom: '30px' }}>
        <h2 style={{ color: '#7059C8', margin: 0 }}>Peake Feeds</h2>
        <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0' }}>The Truth Layer</p>
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px' }}>Password reset request</h1>

      <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
        We received a request to reset the password for your account ({userEmail}). If you didn't request this, you can safely ignore this email.
      </p>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <a
          href={resetLink}
          style={{
            display: 'inline-block',
            background: '#7059C8',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600
          }}
        >
          Reset your password
        </a>
      </div>

      <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
        The link will expire in 1 hour. If the button above doesn't work, copy and paste the following URL into your browser:
      </p>

      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '13px', background: '#f6f6fb', padding: '12px', borderRadius: '6px' }}>{resetLink}</pre>

      <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', fontSize: '12px', color: '#888' }}>
        <p>Sent to {userEmail}</p>
        <p>Peake Feeds • Security Team</p>
      </div>

    </div>
  </div>
);
