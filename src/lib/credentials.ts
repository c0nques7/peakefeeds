import { z } from 'zod';

// One set of rules for every place that accepts a username, email or password
// (registration, password reset, choosing a username after Google sign-up).

// Same characters existing usernames use: letters, numbers, dots and underscores
export const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,30}$/;

export const UsernameSchema = z.string().trim()
  .regex(USERNAME_PATTERN, 'Use 3 to 30 letters, numbers, dots or underscores.');

export const EmailSchema = z.string().trim().toLowerCase()
  .email('Enter a valid email address.').max(254, 'Enter a valid email address.');

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(200, 'Password must be at most 200 characters long.');

/** The first validation message, for actions that return a single `error` string */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input.';
}
