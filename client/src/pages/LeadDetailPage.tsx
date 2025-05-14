import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PencilIcon, ArrowLeftIcon } from "lucide-react";
import { Lead } from "@/types/lead"; // Create this type if needed

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = parseInt(params.id, 10);

  // Fetch lead data
  const { data: lead, isLoading, error } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error('Failed to fetch lead details');
      return res.json();
    },
  });

  // Fetch contact identifiers for the lead
  const { data: contactIdentifiers, isLoading: loadingIdentifiers } = useQuery({
    queryKey: ["/api/leads", leadId, "contact-identifiers"],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/contact-identifiers`);
      if (!res.ok) throw new Error('Failed to fetch contact identifiers');
      return res.json();
    },
  });

  // Fetch communications for the lead
  const { data: communications, isLoading: loadingCommunications } = useQuery({
    queryKey: ["/api/leads", leadId, "communications"],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/communications`);
      if (!res.ok) throw new Error('Failed to fetch communications');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Lead Not Found</h2>
        <p className="text-gray-600">The lead you're looking for doesn't exist or has been deleted.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/leads">
            <Button variant="outline" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {lead.firstName} {lead.lastName}
          </h1>
        </div>
        <Link href={`/leads/${leadId}/edit`}>
          <Button variant="outline" size="sm">
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Lead
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Lead Information</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{lead.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">{lead.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">{lead.status}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Source</dt>
              <dd className="mt-1 text-sm text-gray-900">{lead.leadSource || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Event Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{lead.eventType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Event Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {lead.eventDate ? new Date(lead.eventDate).toLocaleDateString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Guest Count</dt>
              <dd className="mt-1 text-sm text-gray-900">{lead.guestCount || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Venue</dt>
              <dd className="mt-1 text-sm text-gray-900">{lead.venue || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          {loadingIdentifiers ? (
            <div className="py-4 text-center">Loading contact information...</div>
          ) : contactIdentifiers && contactIdentifiers.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-md font-medium">Email Addresses</h3>
              <ul className="space-y-2">
                {contactIdentifiers
                  .filter(ci => ci.type === 'email')
                  .map(email => (
                    <li key={email.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm">{email.value}</span>
                        {email.isPrimary && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Primary</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{email.source}</span>
                    </li>
                  ))}
              </ul>
              <h3 className="text-md font-medium">Phone Numbers</h3>
              <ul className="space-y-2">
                {contactIdentifiers
                  .filter(ci => ci.type === 'phone')
                  .map(phone => (
                    <li key={phone.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm">{phone.value}</span>
                        {phone.isPrimary && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Primary</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{phone.source}</span>
                    </li>
                  ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-4">
                Add Contact Information
              </Button>
            </div>
          ) : (
            <div className="py-4 text-center text-gray-500">
              No additional contact information found.
              <div className="mt-4">
                <Button variant="outline" size="sm">
                  Add Contact Information
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <Tabs defaultValue="communications">
          <TabsList className="mb-4">
            <TabsTrigger value="communications">Communication History</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="communications">
            {loadingCommunications ? (
              <div className="py-4 text-center">Loading communications...</div>
            ) : communications && communications.length > 0 ? (
              <div className="space-y-4">
                <ul className="space-y-4">
                  {communications.map(comm => (
                    <li key={comm.id} className="border-b pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium">{comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}</span>
                          <span className="mx-2 text-gray-400">•</span>
                          <span className="text-gray-500">{comm.direction}</span>
                          {comm.subject && (
                            <>
                              <span className="mx-2 text-gray-400">•</span>
                              <span className="font-medium">{comm.subject}</span>
                            </>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(comm.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm">{comm.bodyRaw}</div>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" className="mt-4">
                  Log Communication
                </Button>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500">
                No communication history found.
                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    Log Communication
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="notes">
            <div className="space-y-4">
              {communications && communications.filter(comm => comm.type === 'note').length > 0 ? (
                <ul className="space-y-4">
                  {communications
                    .filter(comm => comm.type === 'note')
                    .map(note => (
                      <li key={note.id} className="border-b pb-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">
                            {note.subject || 'Note'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(note.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm">{note.bodyRaw}</div>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="py-4 text-center text-gray-500">
                  No notes found.
                </div>
              )}
              <Button variant="outline" size="sm">
                Add Note
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}