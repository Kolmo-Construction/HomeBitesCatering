import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import homebitesLogo from "@assets/homebites-logo.avif";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function FindMyEvent() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const recoverMutation = useMutation({
    mutationFn: async (emailInput: string) => {
      const res = await fetch("/api/public/find-my-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Something went wrong. Please try again.");
      }
      return res.json() as Promise<{ ok: boolean; message: string }>;
    },
    onSuccess: (data) => {
      setSubmitted(true);
      setMessage(data.message);
    },
    onError: (e: Error) => {
      setMessage(e.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    recoverMutation.mutate(email.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-stone-50 to-stone-100 pb-12">
      <Helmet>
        <title>Find Your Event · Homebites Catering</title>
      </Helmet>

      <div className="bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={homebitesLogo} alt="Homebites" className="h-10" />
          <div>
            <p className="font-serif font-bold text-lg leading-tight">
              Homebites Catering
            </p>
            <p className="text-xs text-stone-500 italic font-serif">
              Find your event page
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="text-center mb-6">
          <h1 className="font-serif text-3xl font-semibold text-stone-900">
            Find your event
          </h1>
          <p className="font-serif text-stone-600 mt-2">
            Lost your event page link? Enter the email you used when you booked and
            we'll send it back to you.
          </p>
        </div>

        {!submitted ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="py-8 px-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-stone-700 mb-2 font-serif"
                  >
                    Your email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={recoverMutation.isPending}
                    className="h-12 text-base"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base bg-amber-600 hover:bg-amber-700"
                  disabled={recoverMutation.isPending || !email.trim()}
                >
                  {recoverMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Looking for your event…
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2" />
                      Send me my event link
                    </>
                  )}
                </Button>
                {message && recoverMutation.isError && (
                  <p className="text-sm text-red-600 text-center">{message}</p>
                )}
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
              <h2 className="font-serif text-xl font-semibold text-emerald-900">
                Check your inbox
              </h2>
              <p className="font-serif text-emerald-800 mt-2 max-w-sm mx-auto">
                {message}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
