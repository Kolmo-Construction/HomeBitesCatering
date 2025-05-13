import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarComponent, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay, addMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Users } from "lucide-react";
import { formatDate, formatTime, generateRandomColor } from "@/lib/utils";

// Setup the localizer for react-big-calendar
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function EventCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  
  // Fetch events data
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
  });
  
  // Fetch clients for event details
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });
  
  // Get client name from ID
  const getClientName = (clientId: number) => {
    const client = clients.find((c: any) => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };
  
  // Format events for calendar
  const formattedEvents = events.map((event: any) => ({
    id: event.id,
    title: `${event.eventType} - ${getClientName(event.clientId)}`,
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    allDay: false,
    resource: event, // Store the original event data
  }));
  
  // Handle event selection
  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
  };
  
  // Handle navigation to prev/next month
  const handlePrevMonth = () => {
    setSelectedDate(addMonths(selectedDate, -1));
  };
  
  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };
  
  // Handle close selected event
  const handleCloseEventDetails = () => {
    setSelectedEvent(null);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Event Calendar</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(selectedDate, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-${selectedEvent ? 2 : 3}`}>
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
            </div>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="h-[600px]">
                  <CalendarComponent
                    localizer={localizer}
                    events={formattedEvents}
                    startAccessor="start"
                    endAccessor="end"
                    date={selectedDate}
                    onNavigate={setSelectedDate}
                    onSelectEvent={handleSelectEvent}
                    style={{ height: "100%" }}
                    views={["month", "week", "day"]}
                    defaultView="month"
                    eventPropGetter={(event) => {
                      const backgroundColor = generateRandomColor(event.title);
                      return { style: { backgroundColor } };
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {selectedEvent && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle>{selectedEvent.eventType}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleCloseEventDetails}>
                    &times;
                  </Button>
                </div>
                <CardDescription>
                  {getClientName(selectedEvent.clientId)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2">
                  <CalendarDays className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{formatDate(new Date(selectedEvent.eventDate))}</p>
                    <p className="text-sm text-gray-500">
                      {formatTime(new Date(selectedEvent.startTime))} - {formatTime(new Date(selectedEvent.endTime))}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{selectedEvent.venue}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{selectedEvent.guestCount} guests</p>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Badge className={`bg-${selectedEvent.status === 'confirmed' ? 'green' : selectedEvent.status === 'in-progress' ? 'blue' : selectedEvent.status === 'completed' ? 'purple' : 'red'}-100 text-${selectedEvent.status === 'confirmed' ? 'green' : selectedEvent.status === 'in-progress' ? 'blue' : selectedEvent.status === 'completed' ? 'purple' : 'red'}-800`}>
                    {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                  </Badge>
                </div>
                
                {selectedEvent.notes && (
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-1">Notes:</p>
                    <p className="text-sm text-gray-600">{selectedEvent.notes}</p>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    asChild
                  >
                    <Link href={`/events/${selectedEvent.id}`}>
                      View Event Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
