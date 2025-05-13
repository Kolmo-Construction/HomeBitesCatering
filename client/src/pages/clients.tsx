import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ClientList from "@/components/clients/ClientList";
import ClientForm from "@/components/clients/ClientForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";

export default function Clients() {
  const [location] = useLocation();
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
  
  // Fetch estimates for the client if viewing
  const { data: clientEstimates = [], isLoading: isLoadingEstimates } = useQuery({
    queryKey: ["/api/estimates", selectedClientId],
    queryFn: async () => {
      const res = await fetch('/api/estimates');
      if (!res.ok) throw new Error('Failed to fetch estimates');
      const data = await res.json();
      return data.filter((estimate: any) => estimate.clientId === selectedClientId);
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
        <div className="flex justify-between items-center">
          <h1 className="font-poppins text-2xl font-bold text-neutral-900">Client Details</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {client.firstName} {client.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Contact Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Email:</span> {client.email}</p>
                      <p><span className="font-medium">Phone:</span> {client.phone || "—"}</p>
                      {client.company && (
                        <p><span className="font-medium">Company:</span> {client.company}</p>
                      )}
                    </div>
                  </div>
                  
                  {(client.address || client.city || client.state || client.zip) && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Address</h3>
                      <div className="space-y-2">
                        {client.address && <p>{client.address}</p>}
                        <p>
                          {client.city && `${client.city}, `}
                          {client.state} {client.zip}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {client.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Estimates</h3>
                    {isLoadingEstimates ? (
                      <p className="text-sm text-gray-500">Loading estimates...</p>
                    ) : clientEstimates.length > 0 ? (
                      <ul className="space-y-2">
                        {clientEstimates.map((estimate: any) => (
                          <li key={estimate.id} className="text-sm">
                            <a 
                              href={`/estimates/${estimate.id}/view`} 
                              className="text-primary-purple hover:underline"
                            >
                              {estimate.eventType} - {formatDate(new Date(estimate.createdAt))}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No estimates yet</p>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Client Since</h3>
                    <p className="text-sm">{formatDate(new Date(client.createdAt))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
