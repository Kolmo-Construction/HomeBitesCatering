// client/src/data/eventOptions.ts
import React from "react";
import { Calendar, Utensils, Briefcase, GraduationCap, Gift, Heart, Music, Users } from "lucide-react";

export type EventType = "Wedding" | "Corporate" | "Social" | "Birthday" | "Anniversary" | "Graduation" | "Holiday" | "Other";

// Event types with icons and descriptions
export const eventTypes = [
  {
    type: "Wedding" as EventType,
    icon: React.createElement(Heart, { className: "h-12 w-12 mb-2" }),
    description: "Catering for your special day with customizable packages for ceremonies and receptions.",
    gradient: "from-pink-500 to-rose-500"
  },
  {
    type: "Corporate" as EventType,
    icon: React.createElement(Briefcase, { className: "h-12 w-12 mb-2" }),
    description: "Professional catering for business meetings, conferences, and company events.",
    gradient: "from-blue-500 to-indigo-600"
  },
  {
    type: "Social" as EventType,
    icon: React.createElement(Users, { className: "h-12 w-12 mb-2" }),
    description: "Perfect for gatherings with friends and family, from casual to formal occasions.",
    gradient: "from-purple-500 to-violet-600"
  },
  {
    type: "Birthday" as EventType,
    icon: React.createElement(Gift, { className: "h-12 w-12 mb-2" }),
    description: "Make your birthday celebration special with our customized catering options.",
    gradient: "from-emerald-500 to-teal-600"
  },
  {
    type: "Anniversary" as EventType,
    icon: React.createElement(Calendar, { className: "h-12 w-12 mb-2" }),
    description: "Celebrate your milestone with elegant catering options for intimate gatherings or large parties.",
    gradient: "from-amber-500 to-orange-600"
  },
  {
    type: "Graduation" as EventType,
    icon: React.createElement(GraduationCap, { className: "h-12 w-12 mb-2" }),
    description: "Celebrate academic achievements with catering packages for all graduation events.",
    gradient: "from-red-500 to-rose-600"
  },
  {
    type: "Holiday" as EventType,
    icon: React.createElement(Music, { className: "h-12 w-12 mb-2" }),
    description: "Seasonal and festive menus for holiday parties and special cultural celebrations.",
    gradient: "from-green-500 to-emerald-600"
  },
  {
    type: "Other" as EventType,
    icon: React.createElement(Utensils, { className: "h-12 w-12 mb-2" }),
    description: "Custom catering for any event type not listed - tell us what you're planning!",
    gradient: "from-gray-500 to-slate-600"
  }
];