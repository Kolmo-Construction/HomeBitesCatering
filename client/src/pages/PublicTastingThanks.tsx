// Thank-you landing after a tasting is booked and/or paid. Shown via:
//   /tasting/thanks?tid=123
// If ?tid is present, we fetch the tasting state and show either "Pay to
// confirm" (checkout link button) or "Confirmed — see you [date]" (paid).

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TastingInfo {
  id: number;
  scheduledAt: string;
  guestCount: number;
  totalPriceCents: number;
  status: string;
  paid: boolean;
  paidAt: string | null;
  paymentUrl: string | null;
  firstName: string | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function PublicTastingThanks() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const tid = params.get("tid");
  const [info, setInfo] = useState<TastingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tid) {
      setLoading(false);
      return;
    }
    fetch(`/api/public/tastings/${tid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TastingInfo | null) => {
        if (data) setInfo(data);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [tid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  // Fallback when no tid or tasting not found — still show a thank-you
  if (!info) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-10 text-center shadow-sm">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-serif text-stone-900 mb-2">Thank you!</h1>
          <p className="text-stone-600">
            You should receive a confirmation email shortly. If anything looks
            off, reach out at events@eathomebites.com.
          </p>
        </Card>
      </div>
    );
  }

  const when = formatDateTime(info.scheduledAt);
  const greeting = info.firstName ? `Thank you, ${info.firstName}!` : "Thank you!";

  if (info.paid) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex items-center justify-center px-6 py-10">
        <Card className="max-w-md w-full p-10 text-center shadow-sm">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-serif text-stone-900 mb-2">{greeting}</h1>
          <p className="text-stone-700 mb-4">Your tasting is confirmed.</p>
          <div className="bg-stone-50 rounded-xl p-4 mb-5 text-left">
            <p className="text-sm text-stone-500">When</p>
            <p className="font-medium text-stone-900">{when}</p>
            <p className="text-sm text-stone-500 mt-3">Guests</p>
            <p className="font-medium text-stone-900">{info.guestCount}</p>
            <p className="text-sm text-stone-500 mt-3">Paid</p>
            <p className="font-medium text-stone-900">{formatMoney(info.totalPriceCents)}</p>
          </div>
          <p className="text-sm text-stone-500">
            We&rsquo;ll send a reminder the day before. Questions? Just reply to
            your confirmation email.
          </p>
        </Card>
      </div>
    );
  }

  // Booked but not yet paid — show the pay button
  return (
    <div className="min-h-screen bg-[#fbf6ea] flex items-center justify-center px-6 py-10">
      <Card className="max-w-md w-full p-10 text-center shadow-sm">
        <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-serif text-stone-900 mb-2">{greeting}</h1>
        <p className="text-stone-700 mb-1">Your slot is reserved for:</p>
        <p className="font-semibold text-stone-900 mb-5">{when}</p>
        <p className="text-stone-600 mb-5">
          Complete payment below to confirm your tasting for{" "}
          <strong>{info.guestCount} guests</strong> — total{" "}
          <strong>{formatMoney(info.totalPriceCents)}</strong>.
        </p>
        {info.paymentUrl ? (
          <a href={info.paymentUrl} data-testid="button-pay-tasting">
            <Button className="w-full h-12 bg-[#8B7355] hover:bg-[#7a6448] text-white">
              Pay {formatMoney(info.totalPriceCents)} to confirm
            </Button>
          </a>
        ) : (
          <Button
            className="w-full h-12"
            onClick={async () => {
              const res = await fetch(`/api/tastings/${info.id}/checkout`, { method: "POST" });
              if (!res.ok) {
                alert("Could not generate a payment link. Please check your email for a link, or reply to us.");
                return;
              }
              const { url } = await res.json();
              if (url) window.location.href = url;
            }}
          >
            Generate payment link
          </Button>
        )}
        <p className="text-xs text-stone-400 mt-5">
          Your slot is held for 24 hours. Pay to confirm.
        </p>
      </Card>
    </div>
  );
}
