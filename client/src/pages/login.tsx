import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

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
      
      // Call the success callback if provided
      if (onLoginSuccess) {
        // AuthContext will handle the state update
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#0000EE]/5 to-[#E28C0A]/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-20 w-20 rounded-full mx-auto mb-2 bg-[#0000EE] flex items-center justify-center">
            <span className="text-white text-2xl font-bold">HB</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Home Bites
          </h1>
          <p className="text-gray-600 mt-1">
            Catering Management System
          </p>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Login</h2>
          
          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {loginError}
            </div>
          )}
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0000EE]" 
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0000EE]" 
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-[#0000EE] to-[#E28C0A] text-white py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>For demo purposes, use:</p>
            <p>Username: <span className="font-medium">admin</span> / Password: <span className="font-medium">admin123</span></p>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm">
          <a 
            href="https://www.homebites.net/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#0000EE] hover:text-[#E28C0A]"
          >
            Visit our website
          </a>
        </div>
      </div>
    </div>
  );
}
