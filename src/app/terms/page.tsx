import { LegalPage } from '@/components/legal/LegalPage';

export const metadata = { title: 'Terms · PeakeFeeds' };

// DRAFT: written from how the product works today (invite-only beta, 18+, moderation steps, verified posts,
// self-service deletion). Have it reviewed before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="17 October 2026">
      <p>
        These terms cover your use of PeakeFeeds, which is run by PeakeFeeds (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By
        creating an account you agree to them. PeakeFeeds is in a private beta: features may change, and some may be removed.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or older to use PeakeFeeds. Every account confirms its date of birth before using the app, and we close accounts that belong to anyone younger.</li>
        <li>Accounts are by invitation during the beta. Each invite code works once.</li>
        <li>Keep your password and authenticator codes private. You&apos;re responsible for what happens on your account.</li>
        <li>Don&apos;t share an account or create accounts to get around a ban or suspension.</li>
      </ul>

      <h2>What you can&apos;t post</h2>
      <ul>
        <li>Spam, or posts made in bulk by automated accounts that aren&apos;t labelled as automated.</li>
        <li>Hate speech, harassment or threats of violence.</li>
        <li>Content that deliberately misleads, including misinformation presented as fact.</li>
        <li>Content you don&apos;t have the rights to, and trademark or copyright infringement.</li>
        <li>Impersonation of another person or organisation.</li>
      </ul>
      <p>Anyone can report a post, comment, message, channel or profile, and our moderators review reports.</p>

      <h2>Moderation</h2>
      <p>Depending on how serious a violation is, moderators can:</p>
      <ul>
        <li>remove the content and give a warning;</li>
        <li>mute an account for 24 hours, during which it can read but not post, comment, react or message;</li>
        <li>suspend an account for 7 days, during which it can&apos;t log in;</li>
        <li>ban an account permanently.</li>
      </ul>
      <p>To appeal, open <strong>Help</strong> and ask for a person. Muted accounts can still use Help.</p>

      <h2>Your content</h2>
      <ul>
        <li>You keep ownership of what you post. You give PeakeFeeds permission to store and display it so the service works.</li>
        <li>You can edit or delete unverified posts.</li>
        <li><strong>You can&apos;t edit or delete a verified post on its own.</strong> Once your wallet signs a post, it stays as it is. Deleting your account removes it, but the fingerprint recorded on the blockchain stays there.</li>
        <li>Channel owners and moderators can remove unverified posts in their channels. Our staff can remove any post, verified or not, that breaks these terms or the law.</li>
      </ul>

      <h2>Ending your account</h2>
      <ul>
        <li>You can download your data and delete your account at any time in <strong>Settings</strong>. Deletion is permanent and takes effect straight away.</li>
        <li>We can close accounts that break these terms or the law, or that belong to someone under 18.</li>
      </ul>

      <h2>No guarantees</h2>
      <p>
        PeakeFeeds is provided as it is, without guarantees that it will always be available or free of errors.
        Verification shows that a wallet signed a post; it doesn&apos;t mean the post is true. As far as the law allows,
        we aren&apos;t responsible for indirect or consequential losses from using PeakeFeeds, or for what other people post.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the State of New York, United States. Disputes will be handled by the
        state or federal courts located in New York.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. When we do, we&apos;ll change the date above, and for significant changes we&apos;ll tell you in the app.</p>

      <h2>Contact</h2>
      <p>
        Email <a href="mailto:joewade0110@gmail.com">joewade0110@gmail.com</a>, or open <strong>Help</strong> on any page
        and ask for a person.
      </p>
    </LegalPage>
  );
}
