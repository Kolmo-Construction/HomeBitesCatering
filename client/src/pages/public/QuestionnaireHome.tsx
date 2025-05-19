import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';

// Import the QuestionnaireWizard component
import { QuestionnaireWizard } from '../../components/public/QuestionnaireWizard';

// Event type definition
interface EventType {
  id: string;
  title: string;
  description: string;
  image: string;
  formKey: string;
}

export default function QuestionnaireHome() {
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  
  // Fetch available event types
  const { data: eventTypes, isLoading } = useQuery({
    queryKey: ['/api/form-builder/public/event-types'],
    queryFn: async () => {
      // This will be replaced with actual API integration
      // For now, returning hardcoded event types
      return [
        {
          id: 'wedding',
          title: 'Wedding',
          description: 'Full-service gourmet catering designed for seamless coordination on your special day.',
          image: '/images/events/wedding.jpg',
          formKey: 'wedding-questionnaire'
        },
        {
          id: 'corporate',
          title: 'Corporate Event',
          description: 'Professional catering services for meetings, conferences, and corporate gatherings.',
          image: '/images/events/corporate.jpg',
          formKey: 'corporate-event'
        },
        {
          id: 'birthday',
          title: 'Birthday',
          description: 'Fun and festive catering themes to match any age or personality.',
          image: '/images/events/birthday.jpg',
          formKey: 'birthday-catering'
        },
        {
          id: 'engagement',
          title: 'Engagement',
          description: 'Elegant and romantic setups with tailored menus to celebrate the couples commitment.',
          image: '/images/events/engagement.jpg',
          formKey: 'engagement'
        },
        {
          id: 'food-truck',
          title: 'Food Truck',
          description: 'On-site mobile kitchen delivering fresh, fast, and flavorful fare for any occasion.',
          image: '/images/events/food-truck.jpg',
          formKey: 'food-truck'
        }
      ];
    }
  });

  // If an event is selected, show the questionnaire wizard
  if (selectedEvent) {
    return (
      <QuestionnaireWizard 
        eventType={selectedEvent} 
        onBack={() => setSelectedEvent(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <Helmet>
        <title>Catering Questionnaire | At Home Bites</title>
        <meta 
          name="description" 
          content="Tell us about your event and receive a personalized catering quote from At Home Bites. We offer custom menus for weddings, corporate events, birthdays, and more."
        />
      </Helmet>
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">What are you celebrating?</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tell us about your event, and we'll create a customized catering menu just for you.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {eventTypes?.map((eventType) => (
              <motion.div 
                key={eventType.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className="cursor-pointer h-full overflow-hidden border-2 hover:border-primary hover:shadow-lg transition-all"
                  onClick={() => setSelectedEvent(eventType)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-cover bg-center" 
                      style={{ backgroundImage: `url(${eventType.image})` }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20" />
                  </div>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">{eventType.title}</h2>
                    <p className="text-gray-600 mb-4">{eventType.description}</p>
                    <Button className="w-full">
                      Start Planning
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        
        <div className="text-center mt-16">
          <p className="text-gray-500 mb-4">Need something different?</p>
          <Button variant="outline" className="mx-auto">
            Contact Us For Custom Options
          </Button>
        </div>
      </div>
      
      <footer className="bg-gray-50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>© {new Date().getFullYear()} At Home Bites Catering. All rights reserved.</p>
          <div className="mt-2">
            <a href="#" className="text-gray-600 hover:text-primary mx-2">Privacy Policy</a>
            <a href="#" className="text-gray-600 hover:text-primary mx-2">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}