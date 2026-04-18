import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Event } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { MapPinIcon } from "lucide-react";

export default function UpcomingEventsList() {
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/upcoming"],
  });

  // Get only the next 4 upcoming events
  const upcomingEvents = events.slice(0, 4);

  const getMonthDay = (date: string) => {
    const d = new Date(date);
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: d.getDate()
    };
  };

  // Helper to determine background color for event type
  const getEventColor = (eventType: string) => {
    const typeColors: Record<string, string> = {
      "Wedding": "bg-primary-purple bg-opacity-10 text-primary-purple",
      "Corporate": "bg-primary-blue bg-opacity-10 text-primary-blue",
      "Birthday": "bg-accent bg-opacity-10 text-accent",
      "Fundraiser": "bg-green-500 bg-opacity-10 text-green-500",
      "default": "bg-neutral-500 bg-opacity-10 text-neutral-500"
    };
    
    return typeColors[eventType] || typeColors.default;
  };

  if (isLoading) {
    return (
      <div className="bg-white p-5 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start space-x-3 p-3">
              <Skeleton className="h-16 w-14" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-poppins text-lg font-semibold text-neutral-900">Upcoming Events</h2>
        <Link href="/calendar">
          <a className="text-sm text-primary-purple hover:underline">View Calendar</a>
        </Link>
      </div>
      
      <div className="space-y-4">
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event: Event) => {
            const { month, day } = getMonthDay(typeof event.eventDate === 'string' ? event.eventDate : new Date(event.eventDate).toISOString());
            const colorClass = getEventColor(event.eventType);
            
            return (
              <div 
                key={event.id} 
                className="flex items-start space-x-3 p-3 hover:bg-neutral-50 rounded-lg transition"
              >
                <div className={cn("rounded-lg p-2 text-center min-w-14", colorClass)}>
                  <span className="block text-sm font-semibold">{month}</span>
                  <span className="block text-xl font-bold">{day}</span>
                </div>
                <div>
                  <h3 className="font-medium text-neutral-900">
                    {event.eventType} {/* Client name would be here if available */}
                  </h3>
                  <p className="text-sm text-neutral-700">
                    {event.eventType} • {event.guestCount} guests
                  </p>
                  <div className="flex items-center mt-1 text-xs text-neutral-500">
                    <MapPinIcon className="mr-1 h-3 w-3" />
                    <span>{event.venue}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-neutral-500">
            <p>No upcoming events</p>
            <Link href="/quotes">
              <a className="text-primary-purple hover:underline text-sm mt-2 inline-block">
                Create an quote to book an event
              </a>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
