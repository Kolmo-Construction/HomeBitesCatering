// client/src/components/form-steps/EventTypeSelectionStep.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card"; // Assuming CardHeader, CardTitle, CardDescription are not directly used by EventTypeCard or EventTypeSelectionStep itself but by the main page's cards. Adjust if needed.
import { Button } from "@/components/ui/button";
import { EventType, EventTypeDetails } from "@/types/form-types"; // Adjust path as needed
import { eventTypes } from "@/data/event-types"; // Adjust path as needed

// Component for individual event type cards
// This can remain in the same file as EventTypeSelectionStep if it's only used here.
function EventTypeCard({
  event,
  onSelect,
  isSelected
}: {
  event: EventTypeDetails; // Using the more specific EventTypeDetails
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <Card
      className={`
        overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105
        ${isSelected ? 'ring-4 ring-primary ring-offset-2 scale-105' : ''}
      `}
      onClick={onSelect}
    >
      <div className={`bg-gradient-to-r ${event.gradient} p-8 text-white text-center`}>
        {event.icon}
        <h3 className="text-2xl font-bold mb-1">{event.type}</h3>
      </div>
      <CardContent className="p-6">
        <p className="text-gray-600 text-lg mb-4">{event.description}</p>
        <Button
          className="w-full mt-2 py-6 text-lg transition-all duration-300"
          variant={isSelected ? "default" : "outline"}
          size="lg"
        >
          {isSelected ? "Selected" : "Select This Event"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Step 1: Event Type Selection Component
const EventTypeSelectionStep = ({
  onSelectEventType,
  selectedEventType
}: {
  onSelectEventType: (type: EventType) => void;
  selectedEventType: EventType | null;
}) => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold tracking-tight mb-3 text-gray-900">
          Let's Plan Your Perfect Event
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Select the type of event you're planning, and we'll customize our services to match your vision.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {eventTypes.map((event) => (
          <EventTypeCard
            key={event.type}
            event={event}
            onSelect={() => onSelectEventType(event.type)}
            isSelected={selectedEventType === event.type}
          />
        ))}
      </div>
    </div>
  );
};

export default EventTypeSelectionStep;