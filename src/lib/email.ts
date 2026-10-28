import { Resend } from 'resend';

// The one Resend client for every email we send; null when RESEND_API_KEY isn't set (local dev)
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY.trim()) : null;

// peakefeeds.com is the verified sending domain. Resend's onboarding@resend.dev test sender only
// delivers to the Resend account owner, so it must never be used for mail to members.
export const EMAIL_FROM = 'Peake Feeds <hello@peakefeeds.com>';
export const SECURITY_FROM = 'Peake Feeds <security@peakefeeds.com>';
