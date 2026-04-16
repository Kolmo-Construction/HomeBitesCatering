// Thin fetch shell for the customer-facing wedding proposal page. All the
// actual rendering lives in QuoteProposalView so the admin can render the
// exact same thing in preview mode without a view token.

import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { XCircle, Loader2 } from "lucide-react";
import type { Proposal } from "@shared/proposal";
import QuoteProposalView from "@/components/quote/QuoteProposalView";

interface PublicEstimate {
  id: number;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined";
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
}

interface PublicClient {
  firstName: string;
  lastName: string;
  email: string;
}

interface PublicQuotePayload {
  estimate: PublicEstimate;
  client: PublicClient | null;
  proposal: Proposal;
}

export default function PublicQuote() {
  const [, params] = useRoute("/quote/:token");
  const token = params?.token ?? null;

  const [localStatus, setLocalStatus] = useState<
    "idle" | "accepting" | "accepted" | "declining" | "declined"
  >("idle");
  const [eventPublicUrl, setEventPublicUrl] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<PublicQuotePayload>({
    queryKey: [`/api/public/quote/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/quote/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to load quote");
      }
      return res.json();
    },
    enabled: !!token,
  });

  // Stamp viewedAt the first time the customer opens the quote
  useEffect(() => {
    if (!token || !data) return;
    fetch(`/api/public/quote/${token}/view`, { method: "POST" }).catch(() => undefined);
  }, [token, data?.estimate.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!data) return;
    if (data.estimate.status === "accepted") setLocalStatus("accepted");
    else if (data.estimate.status === "declined") setLocalStatus("declined");
  }, [data]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/quote/${token}/accept`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to accept quote");
      }
      return res.json() as Promise<{ ok: boolean; eventPublicUrl?: string | null }>;
    },
    onMutate: () => setLocalStatus("accepting"),
    onSuccess: (result) => {
      setLocalStatus("accepted");
      if (result.eventPublicUrl) setEventPublicUrl(result.eventPublicUrl);
      refetch();
    },
    onError: (e: Error) => {
      setLocalStatus("idle");
      alert(e.message);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/public/quote/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to decline quote");
      }
      return res.json();
    },
    onMutate: () => setLocalStatus("declining"),
    onSuccess: () => {
      setLocalStatus("declined");
      refetch();
    },
    onError: (e: Error) => {
      setLocalStatus("idle");
      alert(e.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex flex-col items-center justify-center text-stone-500">
        <Loader2 className="h-10 w-10 animate-spin mb-3" />
        <p>Loading your proposal…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-rose-200 p-12 text-center shadow-sm max-w-md">
          <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-serif font-semibold mb-1">Proposal not found</h2>
          <p className="text-stone-600">
            This link may have expired. Please reach out to us directly and
            we&rsquo;ll send you a fresh one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <QuoteProposalView
        proposal={data.proposal}
        estimateStatus={data.estimate.status}
        mode="public"
        acceptFlowState={localStatus}
        acceptedEventUrl={eventPublicUrl}
        onAccept={() => acceptMutation.mutate()}
        onDecline={(reason) => declineMutation.mutate(reason)}
      />
      {/* Tier 3: PDF download for customer */}
      <div className="max-w-3xl mx-auto px-6 pb-8 text-center">
        <a
          href={`/api/public/quote/${token}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 underline"
        >
          Download as PDF
        </a>
      </div>
    </>
  );
}
