// Public magic-link page the client lands on from the decline-feedback email.
// Captures the reason (pricing / menu / timing / other) + optional notes and
// stores it on the quote so Mike can re-engage the solvable ones.

import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Loader2, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Category = "pricing" | "menu" | "timing" | "other";

interface FeedbackInfo {
  firstName: string | null;
  eventType: string;
  eventDate: string | null;
  alreadySubmitted: boolean;
  category: Category | null;
}

const OPTIONS: { value: Category; label: string; blurb: string }[] = [
  { value: "pricing", label: "Pricing or budget", blurb: "The numbers didn't line up." },
  { value: "menu", label: "Menu or style", blurb: "The food wasn't quite the right fit." },
  { value: "timing", label: "Timing or logistics", blurb: "Date, location, or availability." },
  { value: "other", label: "Something else", blurb: "A different reason." },
];

export default function PublicDeclineFeedback() {
  const [, params] = useRoute("/decline-feedback/:token");
  const token = params?.token ?? null;

  const [info, setInfo] = useState<FeedbackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/decline-feedback/${token}`)
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data: FeedbackInfo | null) => {
        if (data) {
          setInfo(data);
          if (data.category) setCategory(data.category);
          if (data.alreadySubmitted) setSubmitted(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!category || !token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/decline-feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, notes: notes.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to submit");
      }
      setSubmitted(true);
    } catch (e: any) {
      alert(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex flex-col items-center justify-center text-stone-500">
        <Loader2 className="h-10 w-10 animate-spin mb-3" />
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-rose-200 p-12 text-center shadow-sm max-w-md">
          <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-serif font-semibold mb-1">Link not valid</h2>
          <p className="text-stone-600">
            This feedback link may have expired or already been submitted. Feel
            free to reach out to us directly at events@eathomebites.com.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-emerald-200 p-10 text-center shadow-sm max-w-md">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-xl font-serif font-semibold mb-2">Thank you</h2>
          <p className="text-stone-600">
            We truly appreciate the feedback — it genuinely helps. If you ever
            want to revisit things, we&rsquo;re one email away.
          </p>
          <p className="mt-4 text-sm text-stone-500">
            — Mike and the Home Bites team
          </p>
        </div>
      </div>
    );
  }

  const greeting = info.firstName ? `Hi ${info.firstName},` : "Hi there,";

  return (
    <div className="min-h-screen bg-[#fbf6ea] px-6 py-12">
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
        <h1 className="text-2xl font-serif text-stone-900 mb-2">{greeting}</h1>
        <p className="text-stone-600 mb-6 leading-relaxed">
          Thanks again for considering us. If you don&rsquo;t mind sharing, which
          of these was closest to the reason?
        </p>

        <div className="space-y-2 mb-5">
          {OPTIONS.map((opt) => {
            const selected = category === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                data-testid={`option-${opt.value}`}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selected
                    ? "border-[#8B7355] bg-[#faf5e9] ring-2 ring-[#E28C0A]/30"
                    : "border-stone-200 hover:border-stone-300 bg-white"
                }`}
              >
                <div className="font-medium text-stone-900">{opt.label}</div>
                <div className="text-sm text-stone-500 mt-0.5">{opt.blurb}</div>
              </button>
            );
          })}
        </div>

        <label className="text-sm text-stone-700 block mb-1">
          Anything else we should know? <span className="text-stone-400">(optional)</span>
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any detail helps — no pressure either way."
          rows={3}
          className="border-stone-300 mb-5"
          data-testid="input-notes"
        />

        <Button
          onClick={handleSubmit}
          disabled={!category || submitting}
          className="w-full h-12 bg-[#8B7355] hover:bg-[#7a6448] text-white"
          data-testid="button-submit-feedback"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            "Send feedback"
          )}
        </Button>

        <p className="text-xs text-stone-400 mt-4 text-center">
          Takes 10 seconds. No login needed.
        </p>
      </div>
    </div>
  );
}
