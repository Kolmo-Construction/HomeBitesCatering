import React from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ThankYou: React.FC = () => {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Helmet>
        <title>Thank You | Home Bites Catering</title>
        <meta name="description" content="Thank you for submitting your catering questionnaire. We'll be in touch with a custom quote for your event soon." />
        <meta property="og:title" content="Thank You | Home Bites Catering" />
        <meta property="og:description" content="Thank you for submitting your catering questionnaire. We'll be in touch with a custom quote for your event soon." />
      </Helmet>
      
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <div className="font-bold text-2xl text-primary">Home Bites</div>
          </div>
          <div>
            <a 
              href="/" 
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              Back to Home
            </a>
          </div>
        </div>
      </header>
      
      <main className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 shadow-lg">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
              
              <p className="text-lg text-gray-600 mb-6 max-w-2xl">
                We've received your questionnaire and are excited to help with your event. 
                Our team will review your requirements and get back to you with a custom quote within 24-48 hours.
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg w-full max-w-md mb-8">
                <h3 className="font-medium text-lg mb-3">What happens next?</h3>
                <ul className="space-y-3 text-left">
                  <li className="flex items-start">
                    <span className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center mr-2 flex-shrink-0">
                      <span className="text-primary text-sm font-bold">1</span>
                    </span>
                    <span>Our team reviews your questionnaire</span>
                  </li>
                  <li className="flex items-start">
                    <span className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center mr-2 flex-shrink-0">
                      <span className="text-primary text-sm font-bold">2</span>
                    </span>
                    <span>We prepare a customized quote based on your specific needs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center mr-2 flex-shrink-0">
                      <span className="text-primary text-sm font-bold">3</span>
                    </span>
                    <span>You'll receive the quote via email along with next steps</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-x-4">
                <Button onClick={() => setLocation('/')}>
                  Return to Home
                </Button>
                
                <Button variant="outline" onClick={() => window.location.href = 'mailto:info@homebites.com'}>
                  Contact Us
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Home Bites Catering</h3>
              <p className="text-gray-600 mb-4">
                Providing delicious, nutritious catering for all your events since 2010.
              </p>
              <p className="text-gray-600">
                © {new Date().getFullYear()} Home Bites. All rights reserved.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
              <p className="text-gray-600 mb-2">Email: info@homebites.com</p>
              <p className="text-gray-600 mb-2">Phone: (555) 123-4567</p>
              <p className="text-gray-600">Address: 123 Main St, Anytown, USA</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href="/" className="hover:underline">Home</a></li>
                <li><a href="#" className="hover:underline">About Us</a></li>
                <li><a href="#" className="hover:underline">Services</a></li>
                <li><a href="#" className="hover:underline">Menu Options</a></li>
                <li><a href="#" className="hover:underline">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ThankYou;