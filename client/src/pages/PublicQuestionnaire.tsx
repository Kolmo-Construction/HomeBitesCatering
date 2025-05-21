import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Event Types
type EventType = 'wedding' | 'corporate' | 'engagement' | 'birthday' | 'food-truck' | 'mobile-bartending';

// Event Card Data with color gradients as visual placeholders
const eventTypes = [
  {
    id: 'wedding',
    title: 'Wedding',
    description: 'Celebrate your special day with our catering services',
    gradient: 'from-rose-400 to-pink-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mb-4">
        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
        <path d="M8.5 8.5a7 7 0 0 0 9.9 9.9 7 7 0 0 0-9.9-9.9Z" />
      </svg>
    )
  },
  {
    id: 'corporate',
    title: 'Corporate Event',
    description: 'Professional catering for business meetings and conferences',
    gradient: 'from-blue-500 to-indigo-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mb-4">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M7 17h10" />
      </svg>
    )
  },
  {
    id: 'engagement',
    title: 'Engagement',
    description: 'Mark your engagement with a memorable catered celebration',
    gradient: 'from-amber-400 to-orange-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mb-4">
        <path d="M12 22v-6" />
        <path d="M8 18h8" />
        <path d="M18 8c0 4.5-6 7-6 10" />
        <path d="M6 8c0 4.5 6 7 6 10" />
        <path d="M12 2v4" />
        <path d="M4 6c2.79.1 5.48-1.47 6-4" />
        <path d="M20 6c-2.79.1-5.48-1.47-6-4" />
      </svg>
    )
  },
  {
    id: 'birthday',
    title: 'Birthday',
    description: 'Make your birthday special with custom catering options',
    gradient: 'from-green-400 to-emerald-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mb-4">
        <path d="M3 12h18" />
        <path d="M3 20h18" />
        <path d="M14 4c-.5-1-1.5-2-2.5-2-.8 0-1.5.5-2 1.5" />
        <path d="M20 16.5c0 1-8 1.5-8-6 0 0 7-0.5 8 6 m-8-10v-4" />
        <path d="M4 16.5c0 1 8 1.5 8-6 0 0-7-0.5-8 6 m8-10v-4" />
      </svg>
    )
  },
  {
    id: 'food-truck',
    title: 'Food Truck',
    description: 'Mobile food service perfect for outdoor events',
    gradient: 'from-purple-500 to-violet-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mb-4">
        <path d="M3 6h13l3 4.5m0 0h.5V18H15" />
        <path d="M10 18H8" />
        <rect width="4" height="4" x="2" y="16" rx="1" />
        <rect width="4" height="4" x="14" y="16" rx="1" />
        <path d="M15 9h4.5c.3 0 .5.1.7.3l1.5 1.7" />
        <path d="M12 16V9" />
      </svg>
    )
  },
  {
    id: 'mobile-bartending',
    title: 'Mobile Bartending',
    description: 'Professional bartending services at your location',
    gradient: 'from-cyan-500 to-teal-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mb-4">
        <path d="m7 9 3 9 3-9" />
        <path d="M16 8h2a2 2 0 0 1 0 4h-1a2 2 0 0 0 0 4h2" />
        <line x1="2" x2="22" y1="2" y2="2" />
        <line x1="2" x2="22" y1="22" y2="22" />
      </svg>
    )
  },
];

// This component displays the customized form for the selected event type
const EventForm = ({ eventType }: { eventType: EventType }) => {
  const event = eventTypes.find(event => event.id === eventType);
  const [formStep, setFormStep] = useState(0);
  
  // Define the form steps based on event type
  const formSteps = [
    { title: "Event Details", fields: ["date", "location", "guests"] },
    { title: "Contact Information", fields: ["name", "email", "phone"] },
    { title: "Menu Preferences", fields: ["dietary", "menu-style", "budget"] }
  ];

  // Animated variants for staggered field appearance
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
  
  // Handle form navigation
  const goToNextStep = () => {
    if (formStep < formSteps.length - 1) {
      setFormStep(formStep + 1);
    }
  };
  
  const goToPreviousStep = () => {
    if (formStep > 0) {
      setFormStep(formStep - 1);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header with event type icon and title */}
      <div className={`p-6 rounded-lg bg-gradient-to-r ${event?.gradient} text-white flex items-center`}>
        <div className="rounded-full p-3 bg-white/20 mr-4">
          {event?.icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{event?.title} Information</h2>
          <p className="opacity-80">Please provide details about your event</p>
        </div>
      </div>
      
      {/* Progress indicators */}
      <div className="flex justify-between mb-4">
        {formSteps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                ${index === formStep ? 'bg-primary text-white' : 
                  index < formStep ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}
            >
              {index < formStep ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className={`ml-2 hidden sm:inline-block text-sm ${index === formStep ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {step.title}
            </span>
            {index < formSteps.length - 1 && (
              <div className={`w-12 h-1 mx-1 ${index < formStep ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            )}
          </div>
        ))}
      </div>
      
      {/* Form fields for current step */}
      <motion.div
        key={`form-step-${formStep}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="p-6 border rounded-lg bg-card shadow-sm"
      >
        <h3 className="text-xl font-semibold mb-4">{formSteps[formStep].title}</h3>
        
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {formStep === 0 && (
            <>
              <motion.div variants={item} className="space-y-2">
                <label className="font-medium">Event Date</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-sm text-muted-foreground">When will your {event?.title.toLowerCase()} take place?</p>
              </motion.div>
              
              <motion.div variants={item} className="space-y-2">
                <label className="font-medium">Number of Guests</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter expected guest count"
                />
              </motion.div>
              
              <motion.div variants={item} className="space-y-2">
                <label className="font-medium">Event Location</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter the venue or address"
                />
              </motion.div>
            </>
          )}
          
          {formStep === 1 && (
            <>
              <motion.div variants={item} className="space-y-2">
                <label className="font-medium">Your Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter your full name"
                />
              </motion.div>
              
              <motion.div variants={item} className="space-y-2">
                <label className="font-medium">Email Address</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter your email address"
                />
              </motion.div>
              
              <motion.div variants={item} className="space-y-2">
                <label className="font-medium">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter your phone number"
                />
              </motion.div>
            </>
          )}
          
          {formStep === 2 && (
            <>
              <motion.div variants={item} className="space-y-2">
                <label className="font-medium">Dietary Restrictions</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center border p-3 rounded-md cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="mr-2" />
                    <span>Vegetarian</span>
                  </label>
                  <label className="flex items-center border p-3 rounded-md cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="mr-2" />
                    <span>Vegan</span>
                  </label>
                  <label className="flex items-center border p-3 rounded-md cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="mr-2" />
                    <span>Gluten-Free</span>
                  </label>
                  <label className="flex items-center border p-3 rounded-md cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="mr-2" />
                    <span>Dairy-Free</span>
                  </label>
                </div>
              </motion.div>
              
              <motion.div variants={item} className="space-y-2">
                <label className="font-medium">Preferred Menu Style</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option value="">Select a menu style</option>
                  <option value="buffet">Buffet Style</option>
                  <option value="plated">Plated Service</option>
                  <option value="family">Family Style</option>
                  <option value="stations">Food Stations</option>
                </select>
              </motion.div>
              
              <motion.div variants={item} className="space-y-2">
                <label className="font-medium">Budget Range (Per Person)</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option value="">Select your budget range</option>
                  <option value="economy">$15-25 per person</option>
                  <option value="standard">$25-40 per person</option>
                  <option value="premium">$40-60 per person</option>
                  <option value="luxury">$60+ per person</option>
                </select>
              </motion.div>
            </>
          )}
        </motion.div>
        
        <div className="flex justify-between mt-8 pt-4 border-t">
          {formStep > 0 ? (
            <Button variant="outline" onClick={goToPreviousStep}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Back
            </Button>
          ) : (
            <div></div>
          )}
          
          {formStep < formSteps.length - 1 ? (
            <Button onClick={goToNextStep}>
              Continue
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Button>
          ) : (
            <Button className={`bg-gradient-to-r ${event?.gradient} hover:opacity-90`}>
              Submit Request
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PublicQuestionnaire() {
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);

  // Handle card selection
  const handleSelectEvent = (eventId: EventType) => {
    setSelectedEvent(eventId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {!selectedEvent ? (
            <motion.div
              key="event-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">What type of event are you planning?</h1>
                <p className="text-xl text-gray-600">
                  Select the type of event to get started with your catering quote
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventTypes.map((event) => (
                  <motion.div
                    key={event.id}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleSelectEvent(event.id as EventType)}
                  >
                    <Card className="overflow-hidden cursor-pointer h-full border-2 hover:border-primary transition-all duration-300 hover:shadow-lg">
                      <div className={`p-8 flex flex-col items-center justify-center bg-gradient-to-br ${event.gradient} text-white`}>
                        <div className="rounded-full p-4 bg-white/20 backdrop-blur-sm mb-4">
                          {event.icon}
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-center">{event.title}</h3>
                      </div>
                      <CardContent className="p-6">
                        <p className="text-gray-600">{event.description}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Select for details</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                              <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="event-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-3xl mx-auto"
            >
              <div className="mb-6">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedEvent(null)}
                  className="flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Back to Event Selection
                </Button>
              </div>
              
              <EventForm eventType={selectedEvent} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}