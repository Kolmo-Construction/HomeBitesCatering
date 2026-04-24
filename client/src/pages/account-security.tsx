import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

export default function AccountSecurity() {
  const { user } = useAuthContext();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My account</h1>
        <p className="text-gray-600 mt-1">
          Signed in as <strong>{user?.username}</strong> ({user?.email}).
        </p>
      </div>

      <ProfileSection user={user} />

      <ChangePasswordSection userId={user?.id} />

      <MfaSection />
    </div>
  );
}

function ProfileSection({ user }: { user: any }) {
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; message?: string }>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setStatus({ kind: "idle" });
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus({
          kind: "err",
          message: body?.errors?.[0]?.message || body?.message || "Couldn't save profile.",
        });
        return;
      }
      setStatus({ kind: "ok", message: "Profile updated." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        {status.kind === "err" && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm">{status.message}</div>
        )}
        {status.kind === "ok" && (
          <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded text-sm">{status.message}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">First name</label>
            <input className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#8B7355]" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Last name</label>
            <input className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#8B7355]" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Email</label>
          <input type="email" className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#8B7355]" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Phone</label>
          <input className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#8B7355]" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button
          type="submit"
          className="bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-2 px-4 rounded disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}

function ChangePasswordSection({ userId }: { userId?: number }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; message?: string }>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: "idle" });
    if (newPassword !== confirm) {
      setStatus({ kind: "err", message: "Passwords don't match." });
      return;
    }
    if (!userId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus({
          kind: "err",
          message: body?.errors?.[0]?.message || body?.message || "Couldn't change password.",
        });
        return;
      }
      setStatus({ kind: "ok", message: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Change password</h2>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        {status.kind === "err" && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm">
            {status.message}
          </div>
        )}
        {status.kind === "ok" && (
          <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded text-sm">
            {status.message}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Current password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#8B7355]"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">New password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#8B7355]"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={12}
          />
          <p className="text-xs text-gray-500 mt-1">At least 12 characters, with upper, lower, and a digit.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Confirm new password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#8B7355]"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={12}
          />
        </div>
        <button
          type="submit"
          className="bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-2 px-4 rounded disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Saving..." : "Change password"}
        </button>
      </form>
    </section>
  );
}

type MfaStatus =
  | { kind: "loading" }
  | { kind: "not_enrolled" }
  | { kind: "enrolled" }
  | { kind: "enrolling"; secret: string; otpauth: string; qrDataUrl: string }
  | { kind: "recovery_codes"; codes: string[] };

function MfaSection() {
  const [status, setStatus] = useState<MfaStatus>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch("/api/auth/mfa/status", { credentials: "include" });
    const data = await res.json();
    setStatus(data.enrolled ? { kind: "enrolled" } : { kind: "not_enrolled" });
  };

  useEffect(() => { refresh(); }, []);

  const beginSetup = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body?.message || "Couldn't start MFA setup.");
        return;
      }
      const data = await res.json();
      setStatus({ kind: "enrolling", secret: data.secret, otpauth: data.otpauth, qrDataUrl: data.qrDataUrl });
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/auth/mfa/verify-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body?.message || "Invalid code.");
        return;
      }
      const data = await res.json();
      setStatus({ kind: "recovery_codes", codes: data.recoveryCodes ?? [] });
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    const currentPassword = window.prompt("Confirm with your current password:");
    if (!currentPassword) return;
    const mfaCode = window.prompt("Enter a code from your authenticator app:");
    if (!mfaCode) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, code: mfaCode }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body?.message || "Couldn't disable MFA.");
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Two-factor authentication</h2>
      {err && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm">{err}</div>
      )}

      {status.kind === "loading" && <p className="text-gray-500">Loading…</p>}

      {status.kind === "not_enrolled" && (
        <div className="space-y-3">
          <p className="text-gray-700">
            Add an extra step when signing in — a 6-digit code from Google Authenticator, 1Password, Authy, or any TOTP app.
          </p>
          <button
            onClick={beginSetup}
            disabled={busy}
            className="bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-2 px-4 rounded disabled:opacity-60"
          >
            {busy ? "Starting..." : "Enable 2FA"}
          </button>
        </div>
      )}

      {status.kind === "enrolling" && (
        <div className="space-y-4 max-w-md">
          <p className="text-gray-700">
            Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
          </p>
          <img src={status.qrDataUrl} alt="MFA QR" className="w-48 h-48 border rounded" />
          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer">Can't scan? Use this secret</summary>
            <code className="block mt-2 p-2 bg-gray-100 rounded break-all">{status.secret}</code>
          </details>
          <form onSubmit={finishSetup} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full px-3 py-2 border rounded text-center tracking-widest focus:outline-none focus:border-[#8B7355]"
              placeholder="123 456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-2 px-4 rounded disabled:opacity-60"
              disabled={busy}
            >
              {busy ? "Verifying..." : "Verify & enable"}
            </button>
          </form>
        </div>
      )}

      {status.kind === "recovery_codes" && (
        <div className="space-y-3 max-w-md">
          <div className="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 rounded text-sm">
            Save these recovery codes somewhere safe. Each can be used once if you lose access to your authenticator.
            <strong className="block mt-1">They will not be shown again.</strong>
          </div>
          <pre className="p-3 bg-gray-100 rounded text-sm font-mono">{status.codes.join("\n")}</pre>
          <button
            onClick={() => setStatus({ kind: "enrolled" })}
            className="bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-2 px-4 rounded"
          >
            I've saved them — done
          </button>
        </div>
      )}

      {status.kind === "enrolled" && (
        <div className="space-y-3">
          <p className="text-green-700 font-semibold">✓ Two-factor authentication is enabled.</p>
          <button
            onClick={disable}
            disabled={busy}
            className="text-red-700 hover:text-red-900 font-semibold"
          >
            Disable 2FA
          </button>
        </div>
      )}
    </section>
  );
}
