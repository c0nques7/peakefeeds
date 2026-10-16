import { LegalPage } from '@/components/legal/LegalPage';

export const metadata = { title: 'Privacy · PeakeFeeds' };

// DRAFT: written from what the code stores and which services it uses. Have it reviewed before launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="16 October 2026">
      <p>
        This page explains what PeakeFeeds collects, why, and who else handles it. PeakeFeeds is in a private beta and
        this policy may change as the product does; we&apos;ll update the date above when it does.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your email address, username, an optional display name and profile picture, and your password, which we store only as a salted hash.</li>
        <li><strong>Two-factor authentication:</strong> if you turn it on, the secret your authenticator app uses.</li>
        <li><strong>A linked wallet address:</strong> if you link one. We only link a wallet after it signs a message proving you own it.</li>
        <li><strong>What you post:</strong> posts, comments, reactions, uploaded images and videos, channels you create and the channels you subscribe to.</li>
        <li><strong>Messages:</strong> direct messages and support conversations, which the people in them and our support staff can read.</li>
        <li><strong>Safety records:</strong> reports you make or that are made about you, and any moderation actions on your account.</li>
        <li><strong>Waitlist sign-ups:</strong> the email address you give us when you ask for access.</li>
      </ul>

      <h2>Verified posts are public and permanent</h2>
      <p>
        When you verify a post, your wallet signs a fingerprint of it. That signature and fingerprint are public, can be
        checked by anyone, and can&apos;t be edited or deleted afterwards. Only verify what you&apos;re happy to keep
        permanently.
      </p>

      <h2>Services we use</h2>
      <ul>
        <li><strong>Vercel</strong> hosts the site and measures page performance and anonymous usage.</li>
        <li><strong>Neon</strong> hosts our database.</li>
        <li><strong>Backblaze B2</strong> stores the images and videos you upload.</li>
        <li><strong>Resend</strong> sends account emails such as invitations and password resets.</li>
        <li><strong>WalletConnect (Reown)</strong> and your wallet provider handle connecting a wallet.</li>
      </ul>
      <p>We don&apos;t sell your data or use it for advertising.</p>

      <h2>Cookies</h2>
      <p>
        We use a cookie to keep you logged in and a cookie that remembers a connected wallet. We don&apos;t use
        advertising cookies.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can turn two-factor authentication on or off and block other users at any time.</li>
        <li>To remove a linked wallet from your account, open <strong>Help</strong> and ask for a person.</li>
        <li>To get a copy of your data or have your account deleted, open <strong>Help</strong> and ask for a person. Posts you verified stay public, as described above.</li>
      </ul>

      <h2>Questions</h2>
      <p>Open <strong>Help</strong> on any page and ask for a person; a member of the team will reply.</p>
    </LegalPage>
  );
}
