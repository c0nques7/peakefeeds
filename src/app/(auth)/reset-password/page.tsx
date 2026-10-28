"use client";

import { completePasswordReset } from "@/actions/auth-reset";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button, ButtonLink, TextField } from "@/components/ui";

// The auth layout provides the card; this page renders only its content.
// useSearchParams needs a Suspense boundary for the page to be prerendered
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loader2 className="mx-auto animate-spin text-[var(--text-muted)]" aria-label="Loading" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!token || !email) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">This link doesn&apos;t work</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            The reset link is incomplete. Links from the email work once; request a new one if this one was already used.
          </p>
        </div>
        <ButtonLink href="/forgot-password" size="lg" fullWidth>Request a new link</ButtonLink>
      </>
    );
  }

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await completePasswordReset(token, email, formData);
      if (result?.error) {
        setError(result.error);
      }
      // Success redirects automatically in the server action
    });
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Choose a new password</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)] break-all">For {email}</p>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <TextField id="password" name="password" type="password" label="New password" autoComplete="new-password" required minLength={8} hint="At least 8 characters." />
        <TextField id="confirm" name="confirm" type="password" label="Confirm new password" autoComplete="new-password" required minLength={8} />

        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-[var(--radius-control)] bg-[var(--status-error-bg)] text-[var(--status-error)] text-sm">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" fullWidth disabled={isPending} icon={isPending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : undefined}>
          Change password
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--text-muted)] border-t border-[var(--glass-border)] pt-5">
        <Link href="/login" className="text-[var(--accent-primary)] font-bold hover:underline">Back to log in</Link>
      </div>
    </>
  );
}
