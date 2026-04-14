import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import homebitesLogo from "@assets/homebites-logo.avif";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ChefHat,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteLineItem {
  id?: string;
  name: string;
  quantity: number;
  price: number; // in cents
}

interface PublicEstimate {
  id: number;
  eventType: string;
  eventDate: string | null;
  guestCount: number | null;
  venue: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueZip: string | null;
  items: QuoteLineItem[] | string | null;
  additionalServices: unknown;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined";
  notes: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
}

interface PublicClient {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface PublicQuotePayload {
  estimate: PublicEstimate;
  client: PublicClient | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "$0.00";
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Date to be confirmed";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Line items may be stored as JSONB (array) or a JSON string — normalize.
function parseLineItems(raw: QuoteLineItem[] | string | null): QuoteLineItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PublicQuote() {
  const [, params] = useRoute("/quote/:token");
  const token = params?.token ?? null;

  const [localStatus, setLocalStatus] = useState<
    "idle" | "accepting" | "accepted" | "declining" | "declined"
  >("idle");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Fetch the quote
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

  // Fire the view stamp once we successfully load
  useEffect(() => {
    if (!token || !data) return;
    // Fire-and-forget — we don't care about the response
    fetch(`/api/public/quote/${token}/view`, { method: "POST" }).catch(() => undefined);
  }, [token, data?.estimate.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync initial status from the fetched data
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
      return res.json();
    },
    onMutate: () => setLocalStatus("accepting"),
    onSuccess: () => {
      setLocalStatus("accepted");
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
      setShowDeclineForm(false);
      refetch();
    },
    onError: (e: Error) => {
      setLocalStatus("idle");
      alert(e.message);
    },
  });

  const estimate = data?.estimate;
  const client = data?.client;
  const lineItems = useMemo(() => parseLineItems(estimate?.items ?? null), [estimate?.items]);

  // ─── Render states ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin mb-3" />
          <p>Loading your quote…</p>
        </div>
      </PageShell>
    );
  }

  if (isError || !estimate) {
    return (
      <PageShell>
        <Card className="border-red-200">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-1">Quote not found</h2>
            <p className="text-muted-foreground">
              This link may have expired or is invalid. Please reach out to Homebites directly.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const effectiveStatus =
    localStatus === "accepted" || estimate.status === "accepted"
      ? "accepted"
      : localStatus === "declined" || estimate.status === "declined"
      ? "declined"
      : "pending";

  return (
    <PageShell>
      <Helmet>
        <title>Your Homebites quote · {estimate.eventType}</title>
      </Helmet>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Your catering quote
        </h1>
        <p className="text-gray-600 mt-1">
          {client ? `Prepared for ${client.firstName} ${client.lastName}` : "Prepared for you"}
        </p>
      </div>

      {/* ─── Status banner ──────────────────────────────────────────────── */}
      {effectiveStatus === "accepted" && (
        <Card className="mb-6 border-green-300 bg-green-50">
          <CardContent className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-green-800">Quote accepted</h2>
            <p className="text-green-700 mt-1">
              Thanks! We'll reach out shortly to lock in the details and handle the deposit.
            </p>
          </CardContent>
        </Card>
      )}

      {effectiveStatus === "declined" && (
        <Card className="mb-6 border-gray-300 bg-gray-50">
          <CardContent className="py-6 text-center">
            <XCircle className="h-12 w-12 text-gray-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-gray-800">Quote declined</h2>
            <p className="text-gray-600 mt-1">
              No worries — if you change your mind or want to adjust the details, just reply to our email.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Event summary ───────────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Event details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                Event type
              </div>
              <div className="font-semibold">{titleCase(estimate.eventType)}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Date
              </div>
              <div className="font-semibold">{formatDate(estimate.eventDate)}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Users className="h-3.5 w-3.5" />
                Guests
              </div>
              <div className="font-semibold">{estimate.guestCount ?? "—"}</div>
            </div>
          </div>

          {(estimate.venue || estimate.venueAddress) && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  {estimate.venue && <div className="font-semibold">{estimate.venue}</div>}
                  {estimate.venueAddress && (
                    <div className="text-muted-foreground">
                      {estimate.venueAddress}
                      {estimate.venueCity ? `, ${estimate.venueCity}` : ""}
                      {estimate.venueZip ? ` ${estimate.venueZip}` : ""}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Line items ─────────────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            What you're getting
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Item</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-right px-4 py-2">Unit</th>
                <th className="text-right px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No line items on this quote.
                  </td>
                </tr>
              )}
              {lineItems.map((item, i) => {
                const total = item.price * item.quantity;
                return (
                  <tr key={item.id ?? i}>
                    <td className="px-4 py-2 font-medium">{item.name}</td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {formatCents(item.price)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatCents(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="px-4 py-3 border-t bg-gray-50">
            <div className="max-w-sm ml-auto space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCents(estimate.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCents(estimate.tax)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base font-bold">
                <span>Total</span>
                <span className="text-emerald-700">{formatCents(estimate.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Notes ──────────────────────────────────────────────────────── */}
      {estimate.notes && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{estimate.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ─── Action CTAs ────────────────────────────────────────────────── */}
      {effectiveStatus === "pending" && !showDeclineForm && (
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            size="lg"
            className="flex-1 h-14 text-base bg-emerald-600 hover:bg-emerald-700"
            disabled={localStatus === "accepting"}
            onClick={() => acceptMutation.mutate()}
          >
            {localStatus === "accepting" ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Accepting…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Accept quote
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-14 text-base"
            onClick={() => setShowDeclineForm(true)}
          >
            <XCircle className="h-5 w-5 mr-2" />
            Decline
          </Button>
        </div>
      )}

      {effectiveStatus === "pending" && showDeclineForm && (
        <Card className="mt-6 border-gray-300">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">
              Can you tell us briefly why? (optional — helps us improve)
            </p>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. budget, found another caterer, change of plans"
              rows={3}
            />
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeclineForm(false)}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={localStatus === "declining"}
                onClick={() => declineMutation.mutate(declineReason.trim())}
              >
                {localStatus === "declining" ? "Declining…" : "Confirm decline"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        Questions? Reply to the email we sent you or reach out directly.
      </div>
    </PageShell>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="w-full bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={homebitesLogo} alt="Homebites" className="h-10" />
          <div>
            <p className="font-bold text-lg leading-tight">Homebites Catering</p>
            <p className="text-xs text-muted-foreground">A quote prepared for you</p>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}

function titleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
