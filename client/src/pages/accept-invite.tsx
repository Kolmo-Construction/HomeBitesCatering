import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import logoImage from "@assets/image_1763692002348.png";
import { Lock, User } from "lucide-react";

type Invite =
  | { status: "checking" }
  | { status: "invalid"; message: string }
  | { status: "valid"; email: string; firstName: string; lastName: string };

export default function AcceptInvite() {
  const [, setLocation] = useLocation();
  const [invite, setInvite] = useState<Invite>({ status: "checking" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  useEffect(() => {
    if (!token) {
      setInvite({ status: "invalid", message: "No invite token in this link." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/auth/invite/${encodeURIComponent(token)}`);
        if (!res.ok) {
          setInvite({ status: "invalid", message: "This invite is invalid or has expired." });
          return;
        }
        const data = await res.json();
        setInvite({ status: "valid", email: data.email, firstName: data.firstName, lastName: data.lastName });
      } catch {
        setInvite({ status: "invalid", message: "Couldn't verify this invite." });
      }
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body?.errors?.[0]?.message || body?.message || "Couldn't accept invite.");
        return;
      }
      // Accept-invite auto-signs the user in, but the AuthContext won't know
      // that yet. Hard-navigate so it fetches /api/auth/me and lands on the
      // dashboard.
      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="h-16 w-16 mx-auto mb-4 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <img src={logoImage} alt="Home Bites Logo" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Home Bites</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Accept invitation</h2>
            {invite.status === "valid" && (
              <p className="text-gray-600 text-sm">
                Welcome, {invite.firstName}. Pick a username and password for <strong>{invite.email}</strong>.
              </p>
            )}
          </div>

          {invite.status === "checking" && <div className="text-center text-gray-500 py-8">Verifying invite…</div>}

          {invite.status === "invalid" && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm">
                {invite.message}
              </div>
              <Link href="/">
                <a className="block text-center text-[#8B7355] font-semibold hover:text-[#E28C0A]">
                  Back to sign in
                </a>
              </Link>
            </div>
          )}

          {invite.status === "valid" && (
            <form onSubmit={submit} className="space-y-5">
              {err && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm">{err}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Choose a username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B7355] h-5 w-5" />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#8B7355] bg-white"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    pattern="[a-zA-Z0-9_.-]+"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Letters, numbers, dot, dash, underscore.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Create a password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B7355] h-5 w-5" />
                  <input
                    type="password"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#8B7355] bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={12}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">At least 12 characters, with upper, lower, and a digit.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Confirm password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#8B7355] bg-white"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={12}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-3 rounded-lg disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Creating account..." : "Accept & sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
