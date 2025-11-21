import { db } from '../db.js';
import { events } from '@shared/schema';
import { and, gte, lte, sql } from 'drizzle-orm';

interface CalendarAvailability {
  isAvailable: boolean;
  conflictingEvents: Array<{
    id: number;
    eventType: string;
    venue: string;
    guestCount: number;
  }>;
}

/**
 * Check if a specific date has any confirmed or in-progress events
 * @param dateString - Event date in format YYYY-MM-DD or any parseable date string
 * @returns Availability status and list of conflicting events if any
 */
export async function checkDateAvailability(dateString: string): Promise<CalendarAvailability> {
  try {
    if (!dateString) {
      return {
        isAvailable: true,
        conflictingEvents: []
      };
    }

    // Parse the date string to ensure it's valid
    const eventDate = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(eventDate.getTime())) {
      console.log(`Invalid date provided: ${dateString}`);
      return {
        isAvailable: true,
        conflictingEvents: []
      };
    }

    // Get start and end of the day in local timezone
    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(eventDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query for events on this date that are confirmed or in-progress
    const conflictingEvents = await db
      .select({
        id: events.id,
        eventType: events.eventType,
        venue: events.venue,
        guestCount: events.guestCount,
        status: events.status,
        eventDate: events.eventDate
      })
      .from(events)
      .where(
        and(
          gte(events.eventDate, startOfDay),
          lte(events.eventDate, endOfDay),
          sql`${events.status} IN ('confirmed', 'in-progress')`
        )
      );

    const isAvailable = conflictingEvents.length === 0;

    return {
      isAvailable,
      conflictingEvents: conflictingEvents.map((event: any) => ({
        id: event.id,
        eventType: event.eventType,
        venue: event.venue,
        guestCount: event.guestCount
      }))
    };
  } catch (error) {
    console.error('Error checking calendar availability:', error);
    // Return available by default if there's an error
    return {
      isAvailable: true,
      conflictingEvents: []
    };
  }
}
