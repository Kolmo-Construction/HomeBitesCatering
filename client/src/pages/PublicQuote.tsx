// Thin fetch shell for the customer-facing wedding proposal page. All the
// actual rendering lives in QuoteProposalView so the admin can render the
// exact same thing in preview mode without a view token.

import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { XCircle, Loader2 } from "lucide-react";
import type { Proposal } from "@shared/proposal";
import QuoteProposalView, {
  type QuoteSiteConfig,
} from "@/components/quotes/QuoteProposalView";

interface PublicQuoteData {
  id: number;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined";
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  infoRequestedAt?: string | null;
  infoRequestNote?: string | null;
  consultationBookedAt?: string | null;
  consultationMeetingUrl?: string | null;
}

interface BookingConfig {
  consultationUrl: string | null;
  tastingUrl: string | null;
  infoRequestedAt: string | null;
  consultationBookedAt: string | null;
  consultationMeetingUrl: string | null;
}

interface PublicClient {
  firstName: string;
  lastName: string;
  email: string;
}

interface PublicQuotePayload {
  quote: PublicQuoteData;
  client: PublicClient | null;
  proposal: Proposal;
  site?: QuoteSiteConfig | null;
}

export default function PublicQuote() {
  const [, params] = useRoute("/quote/:token");
  const token = params?.token ?? null;

  const [localStatus, setLocalStatus] = useState<
    "idle" | "accepting" | "accepted" | "declining" | "declined"
  >("idle");
  const [eventPublicUrl, setEventPublicUrl] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [infoFlowState, setInfoFlowState] = useState<"idle" | "submitting" | "submitted">("idle");
  const [bookingConfig, setBookingConfig] = useState<BookingConfig | null>(null);

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
  }, [token, data?.quote.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pull Cal.com booking config once the quote loads. Cheap GET — safe to run
  // even if the user never clicks "Need More Info."
  useEffect(() => {
    if (!token || !data) return;
    fetch(`/api/public/quote/${token}/booking-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: BookingConfig | null) => {
        if (cfg) setBookingConfig(cfg);
      })
      .catch(() => undefined);
  }, [token, data?.quote.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!data) return;
    if (data.quote.status === "accepted") setLocalStatus("accepted");
    else if (data.quote.status === "declined") setLocalStatus("declined");
  }, [data]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/quote/${token}/accept`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to accept quote");
      }
      return res.json() as Promise<{
        ok: boolean;
        eventPublicUrl?: string | null;
        portalUrl?: string | null;
      }>;
    },
    onMutate: () => setLocalStatus("accepting"),
    onSuccess: (result) => {
      setLocalStatus("accepted");
      if (result.eventPublicUrl) setEventPublicUrl(result.eventPublicUrl);
      if (result.portalUrl) setPortalUrl(result.portalUrl);
      refetch();
    },
    onError: (e: Error) => {
      setLocalStatus("idle");
      alert(e.message);
    },
  });

  // P0-2: "I need more info" — submit note, get back bookingUrl, show iframe
  const handleRequestInfo = async (note: string): Promise<{ bookingUrl: string | null } | null> => {
    if (!token) return null;
    setInfoFlowState("submitting");
    try {
      const res = await fetch(`/api/public/quote/${token}/request-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to submit request");
      }
      const payload = (await res.json()) as { bookingUrl: string | null };
      setInfoFlowState("submitted");
      // Refetch so the sanitized quote reflects infoRequestedAt
      refetch();
      return { bookingUrl: payload.bookingUrl };
    } catch (e: any) {
      setInfoFlowState("idle");
      alert(e.message || "Something went wrong");
      return null;
    }
  };

  const declineMutation = useMutation({
    mutationFn: async (payload: { category: string | null; notes: string }) => {
      const res = await fetch(`/api/public/quote/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: payload.category,
          notes: payload.notes,
          reason: payload.notes, // legacy field — still accepted server-side
        }),
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

  const shareUrl = typeof window !== "undefined" ? window.location.href : null;

  return (
    <QuoteProposalView
      proposal={data.proposal}
      quoteStatus={data.quote.status}
      mode="public"
      acceptFlowState={localStatus}
      acceptedEventUrl={eventPublicUrl}
      acceptedPortalUrl={portalUrl}
      onAccept={() => acceptMutation.mutate()}
      onDecline={(payload) => declineMutation.mutate(payload)}
      onRequestInfo={handleRequestInfo}
      infoFlowState={infoFlowState}
      infoRequestedAt={data.quote.infoRequestedAt ?? null}
      consultationBookedAt={data.quote.consultationBookedAt ?? null}
      consultationMeetingUrl={data.quote.consultationMeetingUrl ?? null}
      resolvedBookingUrl={bookingConfig?.consultationUrl ?? null}
      site={data.site ?? null}
      pdfUrl={`/api/public/quote/${token}/pdf`}
      shareUrl={shareUrl}
    />
  );
}
