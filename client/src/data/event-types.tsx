import React from "react";
import { Cake, Calendar, Gift, Users, Truck, Wine, Utensils } from "lucide-react";
import { EventType, EventTypeDetails } from "@/types/form-types";

// Event type details including description and icon
export const eventTypes: EventTypeDetails[] = [
  {
    type: "Wedding",
    description: "Elegant food service for your special day.",
    icon: <Calendar className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    type: "Corporate",
    description: "Professional catering for business events.",
    icon: <Users className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    type: "Engagement",
    description: "Celebrate your engagement with delicious food.",
    icon: <Gift className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    type: "Birthday",
    description: "Make your birthday celebration memorable.",
    icon: <Cake className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    type: "Food Truck",
    description: "Mobile food service for any outdoor event.",
    icon: <Truck className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-green-500 to-emerald-600",
  },
  {
    type: "Mobile Bartending",
    description: "Professional bartending services at your venue.",
    icon: <Wine className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    type: "Other Private Party",
    description: "Custom catering for your unique gathering.",
    icon: <Utensils className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-teal-500 to-cyan-600",
  },
];

// Helper function to map URL parameter to event type
export function mapUrlToEventType(type: string): EventType | null {
  const eventTypeMap: Record<string, EventType> = {
    "wedding": "Wedding",
    "corporate": "Corporate",
    "engagement": "Engagement",
    "birthday": "Birthday",
    "foodtruck": "Food Truck",
    "mobilebartending": "Mobile Bartending",
    "otherprivateparty": "Other Private Party"
  };
  
  return eventTypeMap[type.toLowerCase()] || null;
}