import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import LeadList from "@/components/leads/LeadList";
import LeadForm from "@/components/leads/LeadForm";
import { useQuery } from "@tanstack/react-query";

export default function Leads() {
  const [location] = useLocation();
  const [mode, setMode] = useState<"list" | "new" | "edit" | "view">("list");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  
  // Extract mode and ID from location
  useEffect(() => {
    if (location === "/leads") {
      setMode("list");
      setSelectedLeadId(null);
    } else if (location === "/leads/new") {
      setMode("new");
      setSelectedLeadId(null);
    } else if (location.match(/^\/leads\/\d+\/edit$/)) {
      setMode("edit");
      setSelectedLeadId(parseInt(location.split("/")[2], 10));
    } else if (location.match(/^\/leads\/\d+$/)) {
      setMode("view");
      setSelectedLeadId(parseInt(location.split("/")[2], 10));
    }
  }, [location]);
  
  // Fetch lead data if editing or viewing
  const { data: lead, isLoading } = useQuery({
    queryKey: ["/api/leads", selectedLeadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${selectedLeadId}`);
      if (!res.ok) throw new Error('Failed to fetch lead details');
      return res.json();
    },
    enabled: (mode === "edit" || mode === "view") && !!selectedLeadId,
  });
  
  // Render appropriate component based on mode
  if (mode === "list") {
    return <LeadList />;
  }
  
  if (mode === "new") {
    return <LeadForm />;
  }
  
  if ((mode === "edit" || mode === "view") && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
      </div>
    );
  }
  
  if (mode === "edit" && lead) {
    return <LeadForm lead={lead} isEditing={true} />;
  }
  
  if (mode === "view" && lead) {
    // For now, just show the lead form in read-only mode
    // In a full implementation, you might want a dedicated view component
    return (
      <div>
        <LeadForm lead={lead} isEditing={false} />
      </div>
    );
  }
  
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Lead Not Found</h2>
      <p className="text-gray-600">The lead you're looking for doesn't exist or has been deleted.</p>
    </div>
  );
}
