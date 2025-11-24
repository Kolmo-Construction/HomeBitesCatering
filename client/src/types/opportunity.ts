export interface Opportunity {
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
  priority?: 'hot' | 'high' | 'medium' | 'low';
  opportunitySource?: string; // Renamed from leadSource
  assignedTo?: number | null;
  clientId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactIdentifier {
  id: number;
  type: 'email' | 'phone';
  value: string;
  opportunityId?: number | null; // Renamed from leadId
  clientId?: number | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface Communication {
  id: number;
  type: 'email' | 'call' | 'sms' | 'note' | 'meeting';
  direction: 'incoming' | 'outgoing' | 'internal';
  opportunityId?: number | null; // Renamed from leadId
  clientId?: number | null;
  subject?: string | null;
  date: string;
  timestamp?: string; // Actual timestamp of the communication
  source?: string; // Source of communication (e.g., 'openphone', 'google_apps_script', 'gmail_sync')
  fromAddress?: string | null;
  toAddress?: string | null;
  bodyRaw?: string | null;
  bodySummary?: string | null;
  durationMinutes?: number | null; // For phone calls
  recordingUrl?: string | null; // For phone call recordings
  metaData?: {
    hasFullEmailInStorage?: boolean;
    hasTranscript?: boolean;
    hasRecording?: boolean;
    [key: string]: any;
  };
  createdAt: string;
  createdBy?: number | null;
}