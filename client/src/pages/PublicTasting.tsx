// P1-1: Public "/tasting" landing page. Marketing + Cal.com embed + pricing.
// The booking itself happens in the Cal.com iframe; the webhook server-side
// picks up the booking (by event-type slug) and emails the customer a Square
// Checkout link. This page is purely the front door.

import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CalConfig {
  consultationUrl: string | null;
  tastingUrl: string | null;
}

export default function PublicTasting() {
  const [tastingUrl, setTastingUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/cal-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: CalConfig | null) => {
        if (cfg?.tastingUrl) setTastingUrl(cfg.tastingUrl);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-[#fbf6ea]">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-serif text-stone-900 mb-3">
          Experience the food before you book
        </h1>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          A private tasting with Mike and the Home Bites team. Come hungry —
          leave knowing exactly what your event will look, taste, and feel like.
        </p>
      </div>

      {/* What you get / pricing */}
      <div className="max-w-5xl mx-auto px-6 pb-8 grid md:grid-cols-2 gap-6">
        <Card className="p-6 shadow-sm">
          <h2 className="text-xl font-serif text-stone-900 mb-3">What's included</h2>
          <ul className="space-y-2 text-stone-700">
            {[
              "Sample dishes from the menu you're considering",
              "Meet the team cooking your event",
              "Review equipment + setup logistics",
              "Ask any questions face-to-face",
              "Typically 60-90 minutes",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-1 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6 shadow-sm bg-gradient-to-br from-[#faf5e9] to-white border-[#e8ddc8]">
          <h2 className="text-xl font-serif text-stone-900 mb-3">Pricing</h2>
          <p className="text-4xl font-bold text-stone-900 mb-1">$125</p>
          <p className="text-stone-600 mb-4">flat — for 2 to 3 guests</p>
          <p className="text-sm text-stone-500 leading-relaxed">
            Payment is collected online after you pick a time. If you book with
            us, the cost of the tasting is credited toward your event.
          </p>
        </Card>
      </div>

      {/* Cal.com embed */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <Card className="shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-white">
            <h2 className="text-xl font-serif text-stone-900">Pick a time</h2>
            <p className="text-sm text-stone-500">All times Pacific.</p>
          </div>
          {tastingUrl ? (
            <iframe
              src={tastingUrl}
              title="Book a tasting"
              className="w-full border-0"
              style={{ height: "min(80vh, 820px)" }}
              data-testid="iframe-tasting-cal-booking"
            />
          ) : (
            <div className="py-16 flex flex-col items-center text-stone-500">
              <Loader2 className="h-6 w-6 animate-spin mb-3" />
              <p>Loading tasting calendar…</p>
              <p className="text-xs mt-2 max-w-xs text-center">
                If this doesn&rsquo;t load, email us at{" "}
                <a className="underline" href="mailto:events@eathomebites.com">
                  events@eathomebites.com
                </a>{" "}
                and we&rsquo;ll set up a time.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
