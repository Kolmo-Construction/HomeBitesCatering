import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import EstimateList from "@/components/estimates/EstimateList";
import EstimateForm from "@/components/estimates/EstimateForm";
import EstimateViewer from "@/components/estimates/EstimateViewer";
import { useQuery } from "@tanstack/react-query";

export default function Estimates() {
  const [location] = useLocation();
  const [mode, setMode] = useState<"list" | "new" | "edit" | "view">("list");
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(null);
  
  // Extract mode and ID from location
  useEffect(() => {
    if (location === "/estimates") {
      setMode("list");
      setSelectedEstimateId(null);
    } else if (location === "/estimates/new") {
      setMode("new");
      setSelectedEstimateId(null);
    } else if (location.match(/^\/estimates\/\d+\/edit$/)) {
      setMode("edit");
      setSelectedEstimateId(parseInt(location.split("/")[2], 10));
    } else if (location.match(/^\/estimates\/\d+\/view$/)) {
      setMode("view");
      setSelectedEstimateId(parseInt(location.split("/")[2], 10));
    }
  }, [location]);
  
  // Fetch estimate data if editing or viewing
  const { data: estimate, isLoading, isError } = useQuery({
    queryKey: ["/api/estimates", selectedEstimateId],
    enabled: (mode === "edit" || mode === "view") && !!selectedEstimateId,
    staleTime: 0, // Don't use cached data
    refetchOnWindowFocus: false, // Don't refetch when window gets focus
    refetchOnMount: true, // Always refetch when component mounts
    onSuccess: (data) => {
      // Debug log to see the data structure from the API
      console.log("Loaded estimate data:", data);
    },
    onError: (error) => {
      console.error("Error loading estimate:", error);
    }
  });
  
  // Debug all current state variables
  console.log("Current state:", { mode, selectedEstimateId, isLoading, isError, estimate });
  
  // Render appropriate component based on mode
  if (mode === "list") {
    return <EstimateList />;
  }
  
  if (mode === "new") {
    return <EstimateForm />;
  }
  
  if (mode === "view") {
    if (!selectedEstimateId) {
      console.error("View mode but no estimate ID");
      return <div className="text-center p-8 text-red-500">Error: No estimate ID provided</div>;
    }
    
    console.log("Rendering viewer for ID:", selectedEstimateId);
    return <EstimateViewer id={selectedEstimateId} />;
  }
  
  if (mode === "edit") {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
        </div>
      );
    }
    
    if (isError) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Quote</h2>
          <p className="text-gray-600">There was an error loading the quote. Please try again.</p>
        </div>
      );
    }
    
    if (!estimate) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quote Not Found</h2>
          <p className="text-gray-600">The quote you're looking for doesn't exist or has been deleted.</p>
        </div>
      );
    }
    
    console.log("Editing estimate:", estimate);
    return <EstimateForm estimate={estimate} isEditing={true} />;
  }
  
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Quote Not Found</h2>
      <p className="text-gray-600">The quote you're looking for doesn't exist or has been deleted.</p>
    </div>
  );
}
