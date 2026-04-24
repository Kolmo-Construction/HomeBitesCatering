import { useState } from "react";
import { Link } from "wouter";
import logoImage from "@assets/image_1763692002348.png";
import { Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Intentionally ignore the response body — the server always returns 204
      // regardless of whether the email matches a user, so we show the same
      // confirmation screen either way. This prevents account enumeration.
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
    } catch {
      // Swallow network errors to preserve the enumeration defense — we'd
      // rather show the same "check your email" screen than leak anything.
    } finally {
      setIsLoading(false);
      setSubmitted(true);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot your password?</h2>
            <p className="text-gray-600 text-sm">
              Enter your account email and we'll send a reset link.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-800 rounded-lg text-sm">
                If an account matches that email, a reset link is on its way. The link expires in 60 minutes.
              </div>
              <Link href="/">
                <a className="block text-center text-[#8B7355] font-semibold hover:text-[#E28C0A]">
                  Back to sign in
                </a>
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B7355] h-5 w-5" />
                  <input
                    type="email"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#8B7355] transition-colors bg-white"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </button>
              <div className="text-center text-sm">
                <Link href="/">
                  <a className="text-[#8B7355] font-semibold hover:text-[#E28C0A]">Back to sign in</a>
                </Link>
                <span className="mx-2 text-gray-400">·</span>
                <Link href="/forgot-username">
                  <a className="text-[#8B7355] font-semibold hover:text-[#E28C0A]">Forgot username?</a>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
