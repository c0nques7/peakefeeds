"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { generateTwoFactorSecret, verifyAndEnableTwoFactor, disableTwoFactor, getTwoFactorStatus } from "@/actions/two-factor";
import { Loader2, ShieldCheck, ShieldAlert, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, inputClasses } from '@/components/ui';

interface TwoFactorSettingsProps {
    userId: string;
}

export default function TwoFactorSettings({ userId }: TwoFactorSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupLoading, setIsSetupLoading] = useState(false);
  const [setupStep, setSetupStep] = useState<"idle" | "qr">("idle");
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [token, setToken] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  useEffect(() => {
      const loadStatus = async () => {
          try {
              const status = await getTwoFactorStatus(userId);
              setIsEnabled(status.isEnabled);
          } catch (e) {
              console.error(e);
          } finally {
              setIsLoading(false);
          }
      };
    loadStatus();
  }, [userId]);

  const startSetup = async () => {
      setIsSetupLoading(true);
      try {
          const { secret, otpauth } = await generateTwoFactorSecret(userId);
          setSecret(secret);
          const qrUrl = await QRCode.toDataURL(otpauth);
          setQrCodeUrl(qrUrl);
          setSetupStep("qr");
      } catch (e) {
          toast.error("Failed to generate 2FA secret");
      } finally {
          setIsSetupLoading(false);
      }
  };

  const verifyAndEnable = async () => {
      if (token.length < 6) return;
      setIsSetupLoading(true);
      try {
          const result = await verifyAndEnableTwoFactor(userId, token, secret);
          if (result.success) {
              setIsEnabled(true);
              setSetupStep("idle");
              setToken("");
              toast.success("Two-factor authentication enabled!");
          } else {
              toast.error(result.error || "Invalid code");
          }
      } catch (e) {
          toast.error("Failed to verify code");
      } finally {
          setIsSetupLoading(false);
      }
  };

  const disable = async () => {
      if (disableCode.length !== 6) return;
      setIsSetupLoading(true);
      try {
          const result = await disableTwoFactor(userId, disableCode);
          if (!result.success) {
              toast.error(result.error || "Invalid code");
              return;
          }
          setIsEnabled(false);
          setIsDisabling(false);
          setDisableCode("");
          toast.success("Two-factor authentication disabled");
      } catch (e) {
          toast.error("Failed to disable 2FA");
      } finally {
          setIsSetupLoading(false);
      }
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent-primary)]" /></div>;

  return (
    <div className="bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-[var(--radius-card)] shadow-[var(--glass-shadow)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex gap-4">
            <div className={`p-3 rounded-[var(--radius-control)] ${isEnabled ? 'bg-[var(--status-success-bg)] text-[var(--status-success)]' : 'bg-[var(--glass-card-hover)] text-[var(--text-muted)]'}`}>
                {isEnabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Two-factor authentication</h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                    {isEnabled 
                        ? "Your account is secured with 2FA." 
                        : "Add an extra layer of security to your account."}
                </p>
            </div>
        </div>
        
        {isEnabled && !isDisabling && (
             <Button variant="danger" size="sm" onClick={() => setIsDisabling(true)}>
                Turn off
             </Button>
        )}
      </div>

      {isEnabled && isDisabling && (
          <div>
              <label htmlFor="disable-2fa-code" className="block text-sm text-[var(--text-primary)] mb-2 font-medium">
                  Enter the current 6-digit code from your authenticator app to turn off 2FA
              </label>
              <div className="flex gap-2">
                  <input
                      id="disable-2fa-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={`${inputClasses} flex-1 font-mono text-lg tracking-widest`}
                  />
                  <Button variant="danger" size="lg" onClick={disable} disabled={disableCode.length !== 6 || isSetupLoading}>
                      {isSetupLoading ? "Turning off…" : "Turn off"}
                  </Button>
              </div>
              <button onClick={() => { setIsDisabling(false); setDisableCode(""); }} className="mt-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
          </div>
      )}

      {!isEnabled && setupStep === "idle" && (
          <Button onClick={startSetup} disabled={isSetupLoading} icon={isSetupLoading ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : undefined}>
            Set up two-factor authentication
          </Button>
      )}

      {!isEnabled && setupStep === "qr" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-[var(--glass-panel)] p-6 rounded-xl border border-[var(--glass-border)] mb-6">
                <div className="text-center mb-6">
                    <p className="text-sm text-[var(--text-primary)] mb-4 font-medium">1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                    <div className="bg-white p-4 rounded-lg inline-block">
                        <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-[var(--text-primary)] mb-2 font-medium">Or enter this key manually:</p>
                    <div className="flex items-center gap-2 bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--glass-border)]">
                        <code className="flex-1 font-mono text-sm text-[var(--text-muted)] break-all">{secret}</code>
                        <button onClick={() => { navigator.clipboard.writeText(secret); toast.success("Copied!"); }} className="p-2 hover:bg-[var(--glass-hover)] rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>

                <div>
                    <p className="text-sm text-[var(--text-primary)] mb-2 font-medium">2. Enter the 6-digit code from the app</p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="000000"
                            value={token}
                            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={`${inputClasses} flex-1 font-mono text-lg tracking-widest`}
                        />
                        <Button size="lg" onClick={verifyAndEnable} disabled={token.length !== 6 || isSetupLoading}>
                            {isSetupLoading ? <Loader2 className="animate-spin" size={18} aria-label="Verifying" /> : "Verify"}
                        </Button>
                    </div>
                </div>
             </div>
             <button onClick={() => setSetupStep("idle")} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel Setup</button>
          </div>
      )}
    </div>
  );
}
