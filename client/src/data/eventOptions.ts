// client/src/data/eventOptions.ts
import React from 'react';
import { 
  Cake, Calendar, Gift, Users, Truck, Wine, Utensils
} from "lucide-react";

export type EventType = 
  | "Wedding" 
  | "Corporate" 
  | "Engagement" 
  | "Birthday" 
  | "Food Truck" 
  | "Mobile Bartending" 
  | "Other Private Party";

export const eventTypes: {
  type: EventType;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  image?: string;
}[] = [
  {
    type: "Wedding",
    description: "Elegant food service for your special day.",
    icon: React.createElement(Calendar, { className: "h-16 w-16 mb-4 text-white" }),
    gradient: "from-pink-500 to-rose-500",
  },
  {
    type: "Corporate",
    description: "Professional catering for business events.",
    icon: React.createElement(Users, { className: "h-16 w-16 mb-4 text-white" }),
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    type: "Engagement",
    description: "Celebrate your engagement with delicious food.",
    icon: React.createElement(Gift, { className: "h-16 w-16 mb-4 text-white" }),
    gradient: "from-purple-500 to-pink-500",
  },
  {
    type: "Birthday",
    description: "Make your birthday celebration memorable.",
    icon: React.createElement(Cake, { className: "h-16 w-16 mb-4 text-white" }),
    gradient: "from-amber-500 to-orange-500",
  },
  {
    type: "Food Truck",
    description: "Mobile food service for any outdoor event.",
    icon: React.createElement(Truck, { className: "h-16 w-16 mb-4 text-white" }),
    gradient: "from-green-500 to-emerald-600",
  },
  {
    type: "Mobile Bartending",
    description: "Professional bartending services at your venue.",
    icon: React.createElement(Wine, { className: "h-16 w-16 mb-4 text-white" }),
    gradient: "from-violet-500 to-purple-600",
  },
  {
    type: "Other Private Party",
    description: "Custom catering for your unique gathering.",
    icon: React.createElement(Utensils, { className: "h-16 w-16 mb-4 text-white" }),
    gradient: "from-teal-500 to-cyan-600",
  },
];