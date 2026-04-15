import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import EstimateList from "@/components/estimates/EstimateList";
import EstimateForm from "@/components/estimates/EstimateForm";
import AdminEstimatePreview from "@/pages/AdminEstimatePreview";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button"; // Added for "Not Found" case
import { ArrowLeftIcon } from "lucide-react"; // Added for "Not Found" case
import { Link } from "wouter"; // Added for "Not Found" case


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

  // Fetch estimate data only for the legacy edit form. The view mode delegates
  // to AdminEstimatePreview which owns its own fetch against /preview.
  const { data: rawEstimateData, isLoading, isError, error } = useQuery<any, Error>({
    queryKey: ["/api/estimates", selectedEstimateId],
    queryFn: async ({ queryKey }) => {
      if (!queryKey[1]) return null;
      const res = await fetch(`/api/estimates/${queryKey[1]}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `Failed to fetch estimate ${queryKey[1]}`);
      }
      return res.json();
    },
    enabled: mode === "edit" && !!selectedEstimateId,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Derive the actual estimate object, handling the case where it might be an array
  const estimate = rawEstimateData && Array.isArray(rawEstimateData) && rawEstimateData.length === 1
                    ? rawEstimateData[0]
                    : rawEstimateData;

  // Render appropriate component based on mode
  if (mode === "list") {
    return <EstimateList />;
  }

  if (mode === "new") {
    return <EstimateForm />;
  }

  // View mode is owned entirely by AdminEstimatePreview
  if (mode === "view") {
    if (!selectedEstimateId) {
      return <div className="text-center p-8 text-red-500">Error: No estimate ID provided for viewing.</div>;
    }
    return <AdminEstimatePreview id={selectedEstimateId} />;
  }

  if (isLoading && mode === "edit") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
        <p className="ml-4 text-gray-600">Loading quote details...</p>
      </div>
    );
  }

  if (isError && mode === "edit") {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Quote</h2>
        <p className="text-gray-600 mb-4">{error?.message || "There was an error loading the quote. Please try again."}</p>
        <Link to="/estimates">
            <Button variant="outline">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Quotes
            </Button>
        </Link>
      </div>
    );
  }

  if (mode === "edit") {
    if (!estimate) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quote Not Found</h2>
          <p className="text-gray-600 mb-4">The quote you're looking for (ID: {selectedEstimateId}) doesn't exist or could not be loaded for editing.</p>
          <Link to="/estimates">
            <Button variant="outline">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Quotes
            </Button>
          </Link>
        </div>
      );
    }
    // Ensure 'estimate' is an object before passing
    if (Array.isArray(estimate)) {
        console.error("CRITICAL: Estimate data is still an array in edit mode just before rendering EstimateForm. This should have been handled.", estimate);
        // As a fallback, try to use the first element if it's the only one.
        // This indicates a deeper issue if the server is sending an array for a single GET.
        if (estimate.length === 1) {
            console.warn("Attempting to use the first element of the estimate array for the form.");
            return <EstimateForm estimate={estimate[0]} isEditing={true} />;
        } else {
             return <div className="text-center py-12"><h2 className="text-2xl font-bold text-red-600 mb-2">Data Error</h2><p className="text-gray-600">Received unexpected data format for the quote.</p></div>;
        }
    }
    console.log("Rendering EstimateForm for editing ID:", selectedEstimateId, "with data:", estimate);
    return <EstimateForm estimate={estimate} isEditing={true} />;
  }

  // Fallback for any unhandled state, though ideally, all paths should be covered.
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid State</h2>
      <p className="text-gray-600 mb-4">Could not determine the correct view for quotes.</p>
      <Link to="/estimates">
          <Button variant="outline">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
      </Link>
    </div>
  );
}