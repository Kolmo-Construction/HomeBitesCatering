import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import logoImage from "@assets/image_1763692002348.png";
import { User, Lock, Utensils, Cake, Wine, Users, Briefcase, UtensilsCrossed } from "lucide-react";

interface LoginProps {
  onLoginSuccess?: (userData: any) => void;
}

const services = [
  { icon: Cake, title: "Weddings", desc: "Elegant celebrations with custom menus" },
  { icon: Briefcase, title: "Corporate Events", desc: "Professional gatherings & conferences" },
  { icon: Users, title: "Private Events", desc: "Intimate gatherings & parties" },
  { icon: UtensilsCrossed, title: "Food Truck", desc: "Mobile catering on-site service" },
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // MFA challenge step — shown after password succeeds for enrolled users.
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const { login, completeMfa } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const result = await login(username, password);
      if (result && (result as any).mfaRequired) {
        setMfaStep(true);
        return;
      }
      if (onLoginSuccess) {
        onLoginSuccess(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(formatLoginError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);
    try {
      await completeMfa(useRecovery ? { recoveryCode: mfaCode } : { code: mfaCode });
      if (onLoginSuccess) onLoginSuccess(true);
    } catch (error) {
      setLoginError(formatLoginError(error));
    } finally {
      setIsLoading(false);
    }
  };

  // apiRequest throws `Error("${status}: ${responseText}")`, so we peel off
  // the prefix and try to pull the server's `message` field out of the JSON.
  function formatLoginError(error: unknown): string {
    if (!(error instanceof Error)) return 'An error occurred during login. Please try again.';
    const match = error.message.match(/^(\d{3}):\s*(.*)$/s);
    if (!match) return error.message;
    const [, status, body] = match;
    let serverMessage = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.message === 'string') serverMessage = parsed.message;
    } catch { /* body wasn't JSON */ }
    if (status === '429') {
      return serverMessage || 'Too many login attempts. Please wait a few minutes and try again.';
    }
    if (status === '401') return 'Invalid username or password.';
    return serverMessage || 'An error occurred during login. Please try again.';
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Services Showcase */}
      <div className="hidden md:flex w-1/2 bg-[#8B7355] text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center">
              <img src={logoImage} alt="Home Bites" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="text-3xl font-bold">Home Bites</h1>
          </div>
          
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-4">Professional Catering Management</h2>
            <p className="text-lg text-white/80">Creating unforgettable moments, one event at a time. We are proud of what we become. The Future is ours. Be Bold, try new things and never give UP!!!.</p>
          </div>

          <div className="space-y-4">
            {services.map((service, idx) => {
              const Icon = service.icon;
              return (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-[#E28C0A] mt-1" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{service.title}</h3>
                    <p className="text-white/70 text-sm">{service.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-white/60 text-sm">
          <p>Trusted by event professionals across Seattle and beyond</p>
          <p className="mt-2">© 2025 Home Bites Catering. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-6 sm:px-12 py-12 bg-gray-50">
        <div className="max-w-md mx-auto w-full">
          {/* Mobile Logo */}
          <div className="md:hidden text-center mb-8">
            <div className="h-16 w-16 mx-auto mb-4 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <img src={logoImage} alt="Home Bites Logo" className="h-14 w-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Home Bites</h1>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
              <p className="text-gray-600">Access your catering dashboard</p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm">
                <div className="font-semibold">Login Error</div>
                <div className="mt-1 text-sm">{loginError}</div>
              </div>
            )}

            {mfaStep ? (
              <form className="space-y-5" onSubmit={handleMfaSubmit}>
                <p className="text-sm text-gray-600 text-center">
                  Enter the 6-digit code from your authenticator app.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    {useRecovery ? "Recovery code" : "Authenticator code"}
                  </label>
                  <input
                    type="text"
                    inputMode={useRecovery ? "text" : "numeric"}
                    autoComplete="one-time-code"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#8B7355] bg-white text-center tracking-widest"
                    placeholder={useRecovery ? "xxxxx-xxxxx" : "123 456"}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-60"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify"}
                </button>
                <div className="text-center text-sm pt-2">
                  <button
                    type="button"
                    onClick={() => { setUseRecovery(!useRecovery); setMfaCode(""); }}
                    className="text-[#8B7355] font-semibold hover:text-[#E28C0A]"
                  >
                    {useRecovery ? "Use authenticator code" : "Use a recovery code"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Username */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B7355] h-5 w-5" />
                    <input
                      type="text"
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#8B7355] transition-colors bg-white"
                      placeholder="your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B7355] h-5 w-5" />
                    <input
                      type="password"
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#8B7355] transition-colors bg-white"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  className="w-full bg-[#8B7355] hover:bg-[#6B5345] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-7"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
                <div className="text-center text-sm pt-2">
                  <a href="/forgot-password" className="text-[#8B7355] font-semibold hover:text-[#E28C0A]">
                    Forgot password?
                  </a>
                  <span className="mx-2 text-gray-400">·</span>
                  <a href="/forgot-username" className="text-[#8B7355] font-semibold hover:text-[#E28C0A]">
                    Forgot username?
                  </a>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-600 text-sm">
              Learn more at 
              <a 
                href="https://www.homebites.net/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 text-[#8B7355] font-semibold hover:text-[#E28C0A] transition-colors"
              >
                homebites.net
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
