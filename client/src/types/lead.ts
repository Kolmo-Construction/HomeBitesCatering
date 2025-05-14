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

export interface ContactIdentifier {
  id: number;
  type: 'email' | 'phone';
  value: string;
  leadId?: number | null;
  clientId?: number | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface Communication {
  id: number;
  type: 'email' | 'call' | 'sms' | 'note' | 'meeting';
  direction: 'incoming' | 'outgoing' | 'internal';
  leadId?: number | null;
  clientId?: number | null;
  content: string;
  subject?: string | null;
  date: string;
  createdAt: string;
  createdBy?: number | null;
}