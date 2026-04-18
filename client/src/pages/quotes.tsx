import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import QuoteList from "@/components/quotes/QuoteList";
import QuoteForm from "@/components/quotes/QuoteForm";
import AdminQuotePreview from "@/pages/AdminQuotePreview";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button"; // Added for "Not Found" case
import { ArrowLeftIcon } from "lucide-react"; // Added for "Not Found" case
import { Link } from "wouter"; // Added for "Not Found" case


export default function Quotes() {
  const [location] = useLocation();
  const [mode, setMode] = useState<"list" | "new" | "edit" | "view">("list");
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);

  // Extract mode and ID from location
  useEffect(() => {
    if (location === "/quotes") {
      setMode("list");
      setSelectedQuoteId(null);
    } else if (location === "/quotes/new") {
      setMode("new");
      setSelectedQuoteId(null);
    } else if (location.match(/^\/quotes\/\d+\/edit$/)) {
      setMode("edit");
      setSelectedQuoteId(parseInt(location.split("/")[2], 10));
    } else if (location.match(/^\/quotes\/\d+\/view$/)) {
      setMode("view");
      setSelectedQuoteId(parseInt(location.split("/")[2], 10));
    }
  }, [location]);

  // Fetch quote data only for the legacy edit form. The view mode delegates
  // to AdminQuotePreview which owns its own fetch against /preview.
  const { data: rawQuoteData, isLoading, isError, error } = useQuery<any, Error>({
    queryKey: ["/api/quotes", selectedQuoteId],
    queryFn: async ({ queryKey }) => {
      if (!queryKey[1]) return null;
      const res = await fetch(`/api/quotes/${queryKey[1]}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `Failed to fetch quote ${queryKey[1]}`);
      }
      return res.json();
    },
    enabled: mode === "edit" && !!selectedQuoteId,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Derive the actual quote object, handling the case where it might be an array
  const quote = rawQuoteData && Array.isArray(rawQuoteData) && rawQuoteData.length === 1
                    ? rawQuoteData[0]
                    : rawQuoteData;

  // Render appropriate component based on mode
  if (mode === "list") {
    return <QuoteList />;
  }

  if (mode === "new") {
    return <QuoteForm />;
  }

  // View mode is owned entirely by AdminQuotePreview
  if (mode === "view") {
    if (!selectedQuoteId) {
      return <div className="text-center p-8 text-red-500">Error: No quote ID provided for viewing.</div>;
    }
    return <AdminQuotePreview id={selectedQuoteId} />;
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
        <Link to="/quotes">
            <Button variant="outline">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Quotes
            </Button>
        </Link>
      </div>
    );
  }

  if (mode === "edit") {
    if (!quote) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quote Not Found</h2>
          <p className="text-gray-600 mb-4">The quote you're looking for (ID: {selectedQuoteId}) doesn't exist or could not be loaded for editing.</p>
          <Link to="/quotes">
            <Button variant="outline">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Quotes
            </Button>
          </Link>
        </div>
      );
    }
    // Ensure 'quote' is an object before passing
    if (Array.isArray(quote)) {
        console.error("CRITICAL: Quote data is still an array in edit mode just before rendering QuoteForm. This should have been handled.", quote);
        // As a fallback, try to use the first element if it's the only one.
        // This indicates a deeper issue if the server is sending an array for a single GET.
        if (quote.length === 1) {
            console.warn("Attempting to use the first element of the quote array for the form.");
            return <QuoteForm quote={quote[0]} isEditing={true} />;
        } else {
             return <div className="text-center py-12"><h2 className="text-2xl font-bold text-red-600 mb-2">Data Error</h2><p className="text-gray-600">Received unexpected data format for the quote.</p></div>;
        }
    }
    console.log("Rendering QuoteForm for editing ID:", selectedQuoteId, "with data:", quote);
    return <QuoteForm quote={quote} isEditing={true} />;
  }

  // Fallback for any unhandled state, though ideally, all paths should be covered.
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid State</h2>
      <p className="text-gray-600 mb-4">Could not determine the correct view for quotes.</p>
      <Link to="/quotes">
          <Button variant="outline">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
      </Link>
    </div>
  );
}