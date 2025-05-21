import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cake, Calendar, Gift, Users, Truck, Wine, Utensils } from "lucide-react";
import { Helmet } from "react-helmet";

// Define event types
type EventType = 
  | "Wedding" 
  | "Corporate" 
  | "Engagement" 
  | "Birthday" 
  | "Food Truck" 
  | "Mobile Bartending" 
  | "Other Private Party";

// Event type details including description and icon
const eventTypes: {
  type: EventType;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}[] = [
  {
    type: "Wedding",
    description: "Elegant food service for your special day.",
    icon: <Calendar className="h-12 w-12 mb-4" />,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    type: "Corporate",
    description: "Professional catering for business events.",
    icon: <Users className="h-12 w-12 mb-4" />,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    type: "Engagement",
    description: "Celebrate your engagement with delicious food.",
    icon: <Gift className="h-12 w-12 mb-4" />,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    type: "Birthday",
    description: "Make your birthday celebration memorable.",
    icon: <Cake className="h-12 w-12 mb-4" />,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    type: "Food Truck",
    description: "Mobile food service for any outdoor event.",
    icon: <Truck className="h-12 w-12 mb-4" />,
    gradient: "from-green-500 to-emerald-600",
  },
  {
    type: "Mobile Bartending",
    description: "Professional bartending services at your venue.",
    icon: <Wine className="h-12 w-12 mb-4" />,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    type: "Other Private Party",
    description: "Custom catering for your unique gathering.",
    icon: <Utensils className="h-12 w-12 mb-4" />,
    gradient: "from-teal-500 to-cyan-600",
  },
];

// Main component
export default function PublicInquiryForm() {
  // State for tracking the current step and selected event type
  const [currentStep, setCurrentStep] = useState<"eventType" | "basicInfo">("eventType");
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

  // Handler for event type selection
  const handleEventTypeSelect = (eventType: EventType) => {
    setSelectedEventType(eventType);
    // Move to the next step
    setCurrentStep("basicInfo");
  };

  // Render event type selection step
  if (currentStep === "eventType") {
    return (
      <>
        <Helmet>
          <title>Event Inquiry | Elite Catering Services</title>
          <meta name="description" content="Tell us about your event and get a personalized catering quote. We offer services for weddings, corporate events, birthdays, and more special occasions." />
        </Helmet>
        
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-3 text-gray-900">
              Let's Plan Your Perfect Event
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Select the type of event you're planning, and we'll customize our services to match your vision.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventTypes.map((event) => (
              <EventTypeCard 
                key={event.type}
                event={event}
                onSelect={() => handleEventTypeSelect(event.type)}
                isSelected={selectedEventType === event.type}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  // Placeholder for the next step (Basic Information)
  // This will be implemented in the next phase
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">Basic Information</h1>
        <p className="text-lg text-gray-600">
          You selected: <span className="font-semibold">{selectedEventType}</span>
        </p>
        <Button 
          className="mt-4"
          onClick={() => setCurrentStep("eventType")}
        >
          Back to Event Types
        </Button>
      </div>
    </div>
  );
}

// Component for individual event type cards
function EventTypeCard({ 
  event, 
  onSelect, 
  isSelected 
}: { 
  event: typeof eventTypes[0]; 
  onSelect: () => void; 
  isSelected: boolean;
}) {
  return (
    <Card 
      className={`
        overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
      onClick={onSelect}
    >
      <div className={`bg-gradient-to-r ${event.gradient} p-6 text-white text-center`}>
        {event.icon}
        <h3 className="text-xl font-bold mb-1">{event.type}</h3>
      </div>
      <CardContent className="p-6">
        <p className="text-gray-600">{event.description}</p>
        <Button 
          className="w-full mt-4 transition-all duration-300"
          variant={isSelected ? "default" : "outline"}
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      </CardContent>
    </Card>
  );
}