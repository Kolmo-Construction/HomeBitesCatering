import React from 'react';
import { useRoute } from 'wouter';
import { Helmet } from 'react-helmet';
import PublicQuestionnaireView from '@/components/PublicQuestionnaireView';

const PublicQuestionnaire: React.FC = () => {
  // Check if we have a specific ID in the URL
  const [match, params] = useRoute('/questionnaire/:id');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Helmet>
        <title>Home Bites Catering | Event Quotation Form</title>
        <meta name="description" content="Fill out our easy-to-use catering quotation form to get a custom quote for your next event. Home Bites offers delicious food with detailed nutritional information." />
        <meta property="og:title" content="Home Bites Catering | Event Quotation Form" />
        <meta property="og:description" content="Get a custom quote for your next event with Home Bites Catering. View nutritional information as you build your perfect menu." />
      </Helmet>
      
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <div className="font-bold text-2xl text-primary">Home Bites</div>
            <div className="ml-8 font-medium text-lg text-gray-600">Catering Quotation</div>
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
      
      <main className="pb-16">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Catering Questionnaire</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Please fill out the form below to help us understand your event needs. 
              As you select menu items, you'll see real-time nutritional information to help you make the best choices for your guests.
            </p>
          </div>
          
          <PublicQuestionnaireView />
          
        </div>
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200">
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

export default PublicQuestionnaire;