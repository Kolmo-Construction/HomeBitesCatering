import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import logoImage from "@assets/image_1763692002348.png";
import { Lock } from "lucide-react";

type TokenState =
  | { status: "checking" }
  | { status: "invalid"; message: string }
  | { status: "valid"; username: string };

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [tokenState, setTokenState] = useState<TokenState>({ status: "checking" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  useEffect(() => {
    if (!token) {
      setTokenState({ status: "invalid", message: "No reset token in this link." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/reset-token/${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          setTokenState({
            status: "invalid",
            message: "This reset link is invalid or has expired. Please request a new one.",
          });
          return;
        }
        const data = await res.json();
        setTokenState({ status: "valid", username: data.username ?? "" });
      } catch {
        if (!cancelled) {
          setTokenState({ status: "invalid", message: "Couldn't verify this link. Please try again." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (newPassword !== confirmPassword) {
      setSubmitError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          body?.errors?.[0]?.message ||
          body?.message ||
          "Couldn't reset password. The link may have expired.";
        setSubmitError(message);
        return;
      }
      setSuccess(true);
      setTimeout(() => setLocation("/"), 2500);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a new password</h2>
            {tokenState.status === "valid" && (
              <p className="text-gray-600 text-sm">
                Resetting password for <strong>{tokenState.username}</strong>.
              </p>
            )}
          </div>

          {tokenState.status === "checking" && (
            <div className="text-center text-gray-500 py-8">Verifying link…</div>
          )}

          {tokenState.status === "invalid" && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm">
                {tokenState.message}
              </div>
              <Link href="/forgot-password">
                <a className="block text-center text-[#8B7355] font-semibold hover:text-[#E28C0A]">
                  Request a new link
                </a>
              </Link>
            </div>
          )}

          {tokenState.status === "valid" && !success && (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {submitError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm">
                  {submitError}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">New password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B7355] h-5 w-5" />
                  <input
                    type="password"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#8B7355] bg-white"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={12}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  At least 12 characters, with upper, lower, and a digit.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B7355] h-5 w-5" />
                  <input
                    type="password"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#8B7355] bg-white"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={12}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Reset password"}
              </button>
            </form>
          )}

          {success && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-800 rounded-lg text-sm">
                Password updated. Redirecting to sign in…
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
