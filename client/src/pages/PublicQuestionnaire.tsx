import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  CalendarHeart, 
  Building, 
  GlassWater, 
  Cake, 
  Truck, 
  Wine
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Define the event types
type EventType = 'wedding' | 'corporate' | 'engagement' | 'birthday' | 'food-truck' | 'mobile-bartending';

// Map event types to form keys
const eventFormKeys: Record<EventType, string> = {
  'wedding': 'wedding-questionnaire',
  'corporate': 'corporate-event',
  'engagement': 'engagement-event',
  'birthday': 'birthday-event',
  'food-truck': 'food-truck-event',
  'mobile-bartending': 'mobile-bartending',
};

// Define event card data
const eventTypes = [
  {
    id: 'wedding',
    title: 'Wedding',
    description: 'Let us cater your special day with elegant food service',
    icon: <CalendarHeart className="w-6 h-6" />,
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: 'corporate',
    title: 'Corporate Event',
    description: 'Professional catering for business meetings and events',
    icon: <Building className="w-6 h-6" />,
    gradient: 'from-blue-600 to-indigo-700',
  },
  {
    id: 'engagement',
    title: 'Engagement',
    description: 'Celebrate your engagement with friends and family',
    icon: <GlassWater className="w-6 h-6" />,
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    id: 'birthday',
    title: 'Birthday',
    description: 'Make your birthday celebration extra special',
    icon: <Cake className="w-6 h-6" />,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'food-truck',
    title: 'Food Truck',
    description: 'Mobile food service for any outdoor event',
    icon: <Truck className="w-6 h-6" />,
    gradient: 'from-emerald-500 to-green-600',
  },
  {
    id: 'mobile-bartending',
    title: 'Mobile Bartending',
    description: 'Professional bartending service at your location',
    icon: <Wine className="w-6 h-6" />,
    gradient: 'from-cyan-500 to-blue-600',
  },
];

// Animation variants for staggered card appearance
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function PublicQuestionnaire() {
  const [, navigate] = useLocation();

  // Handle event selection
  const handleSelectEvent = (eventType: EventType) => {
    const formKey = eventFormKeys[eventType];
    navigate(`/questionnaire/${formKey}`);
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">Event Catering Services</h1>
      <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
        Select your event type below and fill out our questionnaire to receive a customized catering quote for your special occasion.
      </p>

      {/* Show event type selection cards */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {eventTypes.map((event) => (
          <motion.div
            key={event.id}
            variants={item}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer"
            onClick={() => handleSelectEvent(event.id as EventType)}
          >
            <div className={`p-4 bg-gradient-to-r ${event.gradient} text-white`}>
              <div className="flex items-center">
                <div className="rounded-full p-2 bg-white/20 mr-3">
                  {event.icon}
                </div>
                <h2 className="font-bold text-xl">{event.title}</h2>
              </div>
            </div>
            <div className="p-5">
              <p className="text-gray-600 mb-4">{event.description}</p>
              <Button className="w-full">Select</Button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}