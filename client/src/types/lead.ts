export interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  eventType: string;
  eventDate?: string | null;
  guestCount?: number | null;
  venue?: string | null;
  notes?: string | null;
  status: string;
  leadSource?: string;
  assignedTo?: number | null;
  clientId?: number | null;
  createdAt: string;
  updatedAt: string;
}