import { Helmet } from "react-helmet";
import LoginForm from "@/components/auth/LoginForm";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#8A2BE2]/5 to-[#4169E1]/5 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Login - Home Bites Catering Management System</title>
        <meta name="description" content="Login to the Home Bites Catering Management System to manage leads, menus, estimates, and more." />
      </Helmet>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
            alt="Home Bites Logo" 
            className="h-20 w-20 rounded-full mx-auto mb-2"
          />
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">
            Home Bites
          </h1>
          <p className="text-gray-600 mt-1">
            Catering Management System
          </p>
        </div>
        
        <LoginForm />
        
        <div className="mt-6 text-center text-sm">
          <a 
            href="https://www.homebites.net/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-purple hover:text-primary-blue"
          >
            Visit our website
          </a>
        </div>
      </div>
    </div>
  );
}
