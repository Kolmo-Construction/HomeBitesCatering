import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Calendar as BigCalendar, Views, momentLocalizer } from 'react-big-calendar';
import { format, parseISO, isValid } from 'date-fns';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

// Setup the moment localizer for react-big-calendar
const localizer = momentLocalizer(moment);

// Define event source types for color coding
type EventSourceType = 'lead' | 'confirmedEvent' | 'estimate';

// Event object structure for the calendar
interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  sourceType: EventSourceType;
  sourceId: number;
  allDay?: boolean;
  status?: string;
  clientName?: string;
}

// Color mapping based on event source type
const eventStyleGetter = (event: CalendarEvent) => {
  let backgroundColor = '';
  let borderColor = '';

  switch (event.sourceType) {
    case 'lead':
      backgroundColor = '#d1e9fc';
      borderColor = '#2196f3';
      break;
    case 'confirmedEvent':
      backgroundColor = '#c8facd';
      borderColor = '#00a152';
      break;
    case 'estimate':
      backgroundColor = '#fff7cd';
      borderColor = '#b78103';
      break;
    default:
      backgroundColor = '#e0e0e0';
      borderColor = '#9e9e9e';
  }

  // Apply different styling for different statuses
  if (event.status === 'pending') {
    backgroundColor = '#ffecb3';
    borderColor = '#ffa000';
  } else if (event.status === 'cancelled') {
    backgroundColor = '#ffcdd2';
    borderColor = '#d32f2f';
  }

  return {
    style: {
      backgroundColor,
      borderColor,
      borderLeft: `4px solid ${borderColor}`,
      color: '#212121',
    },
  };
};

const Calendar = () => {
  const [, navigate] = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<string>('month');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch leads
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['/api/leads'],
  });

  // Fetch confirmed events
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });

  // Fetch estimates
  const { data: estimates = [] } = useQuery<any[]>({
    queryKey: ['/api/estimates'],
  });

  // Convert API data to calendar events
  const calendarEvents = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // Add leads with eventDate
    leads.forEach((lead: any) => {
      if (lead.eventDate && isValid(new Date(lead.eventDate))) {
        const eventDate = new Date(lead.eventDate);
        allEvents.push({
          id: lead.id,
          title: `Lead: ${lead.firstName} ${lead.lastName}`,
          start: eventDate,
          end: new Date(eventDate.getTime() + 1 * 60 * 60 * 1000), // Default 1 hour
          sourceType: 'lead',
          sourceId: lead.id,
          allDay: false,
          status: lead.status,
        });
      }
    });

    // Add confirmed events
    events.forEach((event: any) => {
      if (event.eventDate && isValid(new Date(event.eventDate))) {
        const eventDate = new Date(event.eventDate);
        // Create end time (default to 2 hours after start if not specified)
        let endDate;
        if (event.endTime) {
          endDate = new Date(event.endTime);
        } else {
          endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
        }

        allEvents.push({
          id: event.id,
          title: `Event: ${event.eventType}`,
          start: eventDate,
          end: endDate,
          sourceType: 'confirmedEvent',
          sourceId: event.id,
          allDay: event.allDay || false,
          status: event.status,
          clientName: event.clientName,
        });
      }
    });

    // Add estimates
    estimates.forEach((estimate: any) => {
      if (estimate.eventDate && isValid(new Date(estimate.eventDate))) {
        const eventDate = new Date(estimate.eventDate);
        allEvents.push({
          id: estimate.id,
          title: `Estimate: ${estimate.clientId ? `Client #${estimate.clientId}` : 'No Client'}`,
          start: eventDate,
          end: new Date(eventDate.getTime() + 1 * 60 * 60 * 1000),
          sourceType: 'estimate',
          sourceId: estimate.id,
          allDay: false,
          status: estimate.status,
        });
      }
    });

    return allEvents;
  }, [leads, events, estimates]);

  // Handle event selection
  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  // Navigate to the appropriate page based on event type
  const navigateToEventSource = () => {
    if (!selectedEvent) return;

    switch (selectedEvent.sourceType) {
      case 'lead':
        navigate(`/leads/${selectedEvent.sourceId}`);
        break;
      case 'confirmedEvent':
        navigate(`/events/${selectedEvent.sourceId}`);
        break;
      case 'estimate':
        navigate(`/estimates/${selectedEvent.sourceId}`);
        break;
    }
    setDialogOpen(false);
  };

  return (
    <div className="container py-6 space-y-6 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/leads/new')}>
            New Lead
          </Button>
          <Button variant="outline" onClick={() => navigate('/events/new')}>
            New Event
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Event Calendar</CardTitle>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="outline" className="bg-[#d1e9fc] text-primary border-primary">
              Leads
            </Badge>
            <Badge variant="outline" className="bg-[#c8facd] text-[#00a152] border-[#00a152]">
              Confirmed Events
            </Badge>
            <Badge variant="outline" className="bg-[#fff7cd] text-[#b78103] border-[#b78103]">
              Estimates
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="month" onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>
            <TabsContent value={viewMode} className="pt-4">
              <div style={{ height: 700 }}>
                <BigCalendar
                  localizer={localizer as any}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  views={{
                    month: true,
                    week: true,
                    day: true,
                    agenda: true,
                  }}
                  view={viewMode as any}
                  onView={(view: string) => setViewMode(view)}
                  eventPropGetter={eventStyleGetter}
                  onSelectEvent={handleEventSelect}
                  popup
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              {selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-medium">Date:</span>
                <span className="col-span-3">
                  {format(selectedEvent.start, 'PPP')}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-medium">Time:</span>
                <span className="col-span-3">
                  {format(selectedEvent.start, 'p')} - {format(selectedEvent.end, 'p')}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-medium">Type:</span>
                <span className="col-span-3 capitalize">
                  {selectedEvent.sourceType}
                </span>
              </div>
              {selectedEvent.status && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-medium">Status:</span>
                  <span className="col-span-3">
                    <Badge
                      variant={
                        selectedEvent.status === 'confirmed' || selectedEvent.status === 'approved'
                          ? 'default'
                          : selectedEvent.status === 'cancelled'
                          ? 'destructive'
                          : 'outline'
                      }
                    >
                      {selectedEvent.status}
                    </Badge>
                  </span>
                </div>
              )}
              {selectedEvent.clientName && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-medium">Client:</span>
                  <span className="col-span-3">{selectedEvent.clientName}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={navigateToEventSource}>
              View Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;