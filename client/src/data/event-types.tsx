import { Heart, Cake, Briefcase, Users, Calendar, PartyPopper } from "lucide-react";
import { EventTypeDetails } from "@/types/form-types";

export const eventTypes: EventTypeDetails[] = [
  {
    type: "wedding",
    title: "Wedding",
    description: "Create unforgettable memories for your special day with our elegant wedding catering services.",
    icon: <Heart className="h-12 w-12 mx-auto mb-3" />,
    gradient: "from-pink-500 to-rose-400"
  },
  {
    type: "birthday",
    title: "Birthday Party",
    description: "Celebrate another year of life with delicious food and joyful moments.",
    icon: <Cake className="h-12 w-12 mx-auto mb-3" />,
    gradient: "from-yellow-500 to-orange-400"
  },
  {
    type: "corporate",
    title: "Corporate Event",
    description: "Professional catering for meetings, conferences, and company celebrations.",
    icon: <Briefcase className="h-12 w-12 mx-auto mb-3" />,
    gradient: "from-blue-600 to-indigo-500"
  },
  {
    type: "anniversary",
    title: "Anniversary",
    description: "Honor your milestone moments with sophisticated catering and service.",
    icon: <Calendar className="h-12 w-12 mx-auto mb-3" />,
    gradient: "from-purple-500 to-pink-400"
  },
  {
    type: "graduation",
    title: "Graduation",
    description: "Celebrate academic achievements with memorable food and festivities.",
    icon: <Users className="h-12 w-12 mx-auto mb-3" />,
    gradient: "from-green-500 to-emerald-400"
  },
  {
    type: "other",
    title: "Other Event",
    description: "Custom catering solutions for any special occasion you have in mind.",
    icon: <PartyPopper className="h-12 w-12 mx-auto mb-3" />,
    gradient: "from-gray-600 to-slate-500"
  }
];