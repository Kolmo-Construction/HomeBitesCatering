import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ClientList from "@/components/clients/ClientList";
import ClientForm from "@/components/clients/ClientForm";
import ClientTimeline from "@/components/clients/ClientTimeline";
import ClientIdentifiers from "@/components/clients/ClientIdentifiers";
import LogCommunicationDialog from "@/components/clients/LogCommunicationDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, PenIcon } from "lucide-react";

export default function Clients() {
  const [location, navigate] = useLocation();
  const [mode, setMode] = useState<"list" | "new" | "edit" | "view">("list");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Extract mode and ID from location
  useEffect(() => {
    if (location === "/clients") {
      setMode("list");
      setSelectedClientId(null);
    } else if (location === "/clients/new") {
      setMode("new");
      setSelectedClientId(null);
    } else if (location.match(/^\/clients\/\d+\/edit$/)) {
      setMode("edit");
      setSelectedClientId(parseInt(location.split("/")[2], 10));
    } else if (location.match(/^\/clients\/\d+$/)) {
      setMode("view");
      setSelectedClientId(parseInt(location.split("/")[2], 10));
    }
  }, [location]);

  // Fetch client data if editing or viewing
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ["/api/clients", selectedClientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}`);
      if (!res.ok) throw new Error('Failed to fetch client details');
      return res.json();
    },
    enabled: (mode === "edit" || mode === "view") && !!selectedClientId,
  });

  // Fetch quotes for the client if viewing
  const { data: clientQuotes = [], isLoading: isLoadingQuotes } = useQuery({
    queryKey: ["/api/quotes", selectedClientId],
    queryFn: async () => {
      const res = await fetch('/api/quotes');
      if (!res.ok) throw new Error('Failed to fetch quotes');
      const data = await res.json();
      return data.filter((quote: any) => quote.clientId === selectedClientId);
    },
    enabled: mode === "view" && !!selectedClientId,
  });

  // Render appropriate component based on mode
  if (mode === "list") {
    return <ClientList />;
  }

  if (mode === "new") {
    return <ClientForm />;
  }

  if ((mode === "edit" || mode === "view") && isLoadingClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
      </div>
    );
  }

  if (mode === "edit" && client) {
    return <ClientForm client={client} isEditing={true} />;
  }

  if (mode === "view" && client) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/clients")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="font-poppins text-2xl font-bold text-neutral-900">
              {client.firstName} {client.lastName}
            </h1>
            <Badge variant={client.type === "customer" ? "default" : "secondary"} className="capitalize">
              {client.type || "prospect"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <LogCommunicationDialog clientId={client.id} />
            <Button size="sm" variant="outline" onClick={() => navigate(`/clients/${client.id}/edit`)}>
              <PenIcon className="h-4 w-4 mr-1" /> Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Timeline (main content) */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="timeline">
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="quotes">Quotes ({clientQuotes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <ClientTimeline clientId={client.id} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="quotes" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {isLoadingQuotes ? (
                      <p className="text-sm text-gray-500">Loading quotes...</p>
                    ) : clientQuotes.length > 0 ? (
                      <ul className="space-y-3">
                        {clientQuotes.map((quote: any) => (
                          <li key={quote.id} className="p-3 border rounded-lg hover:bg-gray-50">
                            <a href={`/quotes/${quote.id}/view`} className="block">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-primary-purple">
                                  {quote.eventType} - {formatDate(new Date(quote.createdAt))}
                                </span>
                                <Badge variant="outline" className="capitalize text-xs">
                                  {quote.status}
                                </Badge>
                              </div>
                              {quote.total && (
                                <span className="text-xs text-gray-500">
                                  ${(quote.total / 100).toLocaleString()}
                                </span>
                              )}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No quotes yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column: Contact info + Identifiers */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-gray-500">Email:</span> {client.email}</p>
                  <p><span className="font-medium text-gray-500">Phone:</span> {client.phone || "---"}</p>
                  {client.company && (
                    <p><span className="font-medium text-gray-500">Company:</span> {client.company}</p>
                  )}
                  {(client.address || client.city) && (
                    <p>
                      <span className="font-medium text-gray-500">Address:</span>{" "}
                      {[client.address, client.city, client.state, client.zip].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>

                {client.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t text-xs text-gray-400">
                  Client since {formatDate(new Date(client.createdAt))}
                </div>
              </CardContent>
            </Card>

            <ClientIdentifiers clientId={client.id} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Client Not Found</h2>
      <p className="text-gray-600">The client you're looking for doesn't exist or has been deleted.</p>
    </div>
  );
}
