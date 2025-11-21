import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import logoImage from "@assets/image_1763692002348.png";
import { User, Lock, ChefHat } from "lucide-react";

interface LoginProps {
  onLoginSuccess?: (userData: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      await login(username, password);
      
      if (onLoginSuccess) {
        onLoginSuccess(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error instanceof Error ? error.message : 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0000EE] via-purple-600 to-[#E28C0A] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/4 translate-y-1/4"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="h-24 w-24 mx-auto mb-6 bg-white rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <img src={logoImage} alt="Home Bites Logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            Home Bites
          </h1>
          <p className="text-white/80 text-sm font-medium flex items-center justify-center gap-2">
            <ChefHat className="h-4 w-4" />
            Professional Catering Management
          </p>
        </div>
        
        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 text-sm mt-1">Sign in to your catering management dashboard</p>
          </div>
          
          {/* Error Message */}
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm animate-pulse">
              <div className="font-medium">Login Failed</div>
              <div className="mt-1">{loginError}</div>
            </div>
          )}
          
          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Username</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0000EE] h-5 w-5 group-focus-within:text-[#E28C0A] transition-colors" />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#0000EE] focus:ring-2 focus:ring-[#0000EE]/20 transition-all duration-200 bg-gray-50 hover:bg-white" 
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0000EE] h-5 w-5 group-focus-within:text-[#E28C0A] transition-colors" />
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#0000EE] focus:ring-2 focus:ring-[#0000EE]/20 transition-all duration-200 bg-gray-50 hover:bg-white" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            {/* Submit Button */}
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-[#0000EE] to-[#E28C0A] text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg hover:scale-105 transform transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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
          </form>
          
          {/* Demo Credentials Info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-orange-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Demo Credentials</p>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <p><span className="font-semibold">Username:</span> <code className="bg-white px-2 py-1 rounded text-[#0000EE]">admin</code></p>
              <p><span className="font-semibold">Password:</span> <code className="bg-white px-2 py-1 rounded text-[#0000EE]">admin123</code></p>
            </div>
          </div>
        </div>
        
        {/* Footer Link */}
        <div className="mt-8 text-center">
          <p className="text-white/80 text-sm">
            Want to learn more? 
            <a 
              href="https://www.homebites.net/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-1 text-white font-semibold hover:underline hover:text-[#FFD700] transition-colors"
            >
              Visit our website
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
