// What to tell people when sign-in comes back with an error code (from next-auth or our own
// Google sign-in rules in lib/google-signup.ts).
export function describeAuthError(code: string | null): string {
  if (!code) return '';
  if (code.startsWith('ACCOUNT_SUSPENDED')) {
    const until = code.split('ACCOUNT_SUSPENDED:')[1];
    return until
      ? `This account is suspended until ${new Date(until).toLocaleString()}.`
      : 'This account has been suspended.';
  }
  switch (code) {
    case 'ACCOUNT_UNDERAGE':
      return 'This account has been closed because it doesn\'t meet our minimum age. If that\'s a mistake, open Help and ask for a person.';
    case 'InviteRequired':
      return "There's no PeakeFeeds account for that Google account yet. Enter an invite code to create one.";
    case 'GoogleEmailUnverified':
      return "Your Google account's email address isn't verified, so it can't be used to log in.";
    case 'OAuthAccountNotLinked':
      return 'That email already has an account. Log in with your email and password.';
    case 'AccessDenied':
      return "That account can't log in right now.";
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'Callback':
      return "Logging in with Google didn't finish. Try again.";
    default:
      return 'Something went wrong while logging in. Try again.';
  }
}

/** The ?error= code in the current URL, if any (read in the browser after the page loads). */
export function readAuthErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('error');
}
