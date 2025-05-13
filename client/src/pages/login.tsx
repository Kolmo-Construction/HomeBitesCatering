export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#8A2BE2]/5 to-[#4169E1]/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-20 w-20 rounded-full mx-auto mb-2 bg-purple-500 flex items-center justify-center">
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
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                placeholder="Enter your username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                placeholder="Enter your password"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] text-white py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
            >
              Sign In
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
            className="text-purple-700 hover:text-blue-700"
          >
            Visit our website
          </a>
        </div>
      </div>
    </div>
  );
}
