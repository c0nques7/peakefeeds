"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { generateTwoFactorSecret, verifyAndEnableTwoFactor, disableTwoFactor, getTwoFactorStatus } from "@/actions/two-factor";
import { Loader2, ShieldCheck, ShieldAlert, Copy } from "lucide-react";
import { toast } from "sonner";

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
      if (!confirm("Are you sure you want to disable 2FA? Your account will be less secure.")) return;
      setIsSetupLoading(true);
      try {
          await disableTwoFactor(userId);
          setIsEnabled(false);
          toast.success("Two-factor authentication disabled");
      } catch (e) {
          toast.error("Failed to disable 2FA");
      } finally {
          setIsSetupLoading(false);
      }
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent-primary)]" /></div>;

  return (
    <div className="bg-[var(--glass-card)] border border-[var(--glass-border)] rounded-2xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex gap-4">
            <div className={`p-3 rounded-xl ${isEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--bg-app)] text-[var(--text-muted)]'}`}>
                {isEnabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Two-Factor Authentication</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                    {isEnabled 
                        ? "Your account is secured with 2FA." 
                        : "Add an extra layer of security to your account."}
                </p>
            </div>
        </div>
        
        {isEnabled && (
             <button 
                onClick={disable}
                disabled={isSetupLoading}
                className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
             >
                {isSetupLoading ? "Disabling..." : "Disable"}
             </button>
        )}
      </div>

      {!isEnabled && setupStep === "idle" && (
          <button 
            onClick={startSetup}
            disabled={isSetupLoading}
            className="w-full py-3 rounded-xl bg-[var(--accent-primary)] text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isSetupLoading && <Loader2 className="animate-spin" size={18} />}
            Setup 2FA
          </button>
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
                            className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-app)] border border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-lg tracking-widest focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                        <button 
                            onClick={verifyAndEnable}
                            disabled={token.length !== 6 || isSetupLoading}
                            className="px-6 py-3 rounded-lg bg-[var(--accent-primary)] text-white font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                            {isSetupLoading ? <Loader2 className="animate-spin" /> : "Verify"}
                        </button>
                    </div>
                </div>
             </div>
             <button onClick={() => setSetupStep("idle")} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel Setup</button>
          </div>
      )}
    </div>
  );
}
