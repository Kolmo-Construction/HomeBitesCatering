/**
 * Tier 3, Item 11: Client Portal
 *
 * Magic-link authenticated portal for clients to see all their events and quotes.
 * URL: /my-events?token=xxx (token from magic link email)
 *
 * After verification, stores session token in localStorage and shows dashboard.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { getEventTheme } from "@/lib/eventThemes";
import {
  Calendar,
  Users,
  MapPin,
  Mail,
  Loader2,
  ExternalLink,
  FileText,
  PartyPopper,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SESSION_KEY = "hb_portal_session";
const CLIENT_KEY = "hb_portal_client";

interface PortalEvent {
  id: number;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  venue: string;
  status: string;
  viewToken: string | null;
}

interface PortalEstimate {
  id: number;
  eventType: string;
  eventDate: string | null;
  guestCount: number | null;
  venue: string | null;
  status: string;
  total: number;
  viewToken: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
}

interface PortalClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  type: string;
}

interface PortalData {
  client: PortalClient;
  events: PortalEvent[];
  estimates: PortalEstimate[];
}

// ─── Login screen ────────────────────────────────────────────────────────────

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const requestMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/public/portal/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to request link");
      return res.json();
    },
    onSuccess: () => setSent(true),
    onError: () => toast({ title: "Something went wrong", variant: "destructive" }),
  });

  if (sent) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Mail className="h-12 w-12 text-[#8B7355] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "Georgia, serif" }}>Check Your Email</h2>
            <p className="text-gray-600">
              If we found your account, we've sent a login link to <strong>{email}</strong>.
              It expires in 30 minutes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle style={{ fontFamily: "Georgia, serif" }}>My Events</CardTitle>
          <CardDescription>Enter your email to access your event portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); requestMutation.mutate(email); }} className="space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="w-full bg-[#8B7355] hover:bg-[#6B5345]"
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Login Link
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Portal dashboard ────────────────────────────────────────────────────────

function PortalDashboard({ data, onLogout }: { data: PortalData; onLogout: () => void }) {
  const upcomingEvents = data.events
    .filter(e => new Date(e.eventDate) >= new Date() && e.status !== "cancelled")
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  const pastEvents = data.events
    .filter(e => new Date(e.eventDate) < new Date() || e.status === "completed")
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  const pendingQuotes = data.estimates.filter(e => e.status === "sent" || e.status === "viewed");

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>
              Welcome back, {data.client.firstName}
            </h1>
            <p className="text-sm text-gray-500">{data.client.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Pending quotes */}
        {pendingQuotes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "Georgia, serif" }}>
              <FileText className="h-5 w-5 inline mr-2 text-amber-600" />
              Quotes Awaiting Your Review
            </h2>
            <div className="grid gap-3">
              {pendingQuotes.map(est => {
                const theme = getEventTheme(est.eventType);
                return (
                  <a
                    key={est.id}
                    href={est.viewToken ? `/quote/${est.viewToken}` : "#"}
                    className="block"
                  >
                    <Card className="hover:shadow-md transition cursor-pointer" style={{ borderLeftColor: theme.primary, borderLeftWidth: 4 }}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize">{est.eventType.replace(/_/g, " ")}</div>
                          <div className="text-sm text-gray-500">
                            {est.eventDate ? formatDate(new Date(est.eventDate)) : "Date TBD"} · {est.guestCount || "?"} guests
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold">${(est.total / 100).toLocaleString()}</div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming events */}
        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "Georgia, serif" }}>
            <PartyPopper className="h-5 w-5 inline mr-2 text-green-600" />
            Upcoming Events
          </h2>
          {upcomingEvents.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-gray-500">No upcoming events.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {upcomingEvents.map(evt => {
                const theme = getEventTheme(evt.eventType);
                const daysUntil = Math.ceil((new Date(evt.eventDate).getTime() - Date.now()) / 86400000);
                return (
                  <a
                    key={evt.id}
                    href={evt.viewToken ? `/event/${evt.viewToken}` : "#"}
                    className="block"
                  >
                    <Card className="hover:shadow-md transition cursor-pointer overflow-hidden">
                      <div className="h-1.5" style={{ background: theme.gradient }} />
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{theme.icon}</span>
                              <span className="font-medium capitalize">{evt.eventType.replace(/_/g, " ")}</span>
                              <Badge variant="secondary" className="text-xs">{evt.status}</Badge>
                            </div>
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(new Date(evt.eventDate))}</span>
                              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{evt.guestCount}</span>
                              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{evt.venue}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <div className="text-2xl font-bold" style={{ color: theme.primary }}>{daysUntil}</div>
                            <div className="text-xs text-gray-500">days away</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Past events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "Georgia, serif" }}>
              Past Events
            </h2>
            <div className="grid gap-2">
              {pastEvents.map(evt => {
                const theme = getEventTheme(evt.eventType);
                return (
                  <a key={evt.id} href={evt.viewToken ? `/event/${evt.viewToken}` : "#"} className="block">
                    <Card className="hover:shadow-sm transition cursor-pointer opacity-80">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{theme.icon}</span>
                          <span className="text-sm font-medium capitalize">{evt.eventType.replace(/_/g, " ")}</span>
                          <span className="text-xs text-gray-400">{formatDate(new Date(evt.eventDate))}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" /> View
                        </Button>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ClientPortal() {
  const [location] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem(SESSION_KEY));
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  // Extract magic link token from URL
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const magicToken = urlParams.get("token");

  // Verify magic link token on mount
  useEffect(() => {
    if (magicToken && !sessionToken) {
      setVerifying(true);
      fetch("/api/public/portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: magicToken }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Verification failed");
          }
          return res.json();
        })
        .then((data) => {
          localStorage.setItem(SESSION_KEY, data.sessionToken);
          if (data.client) localStorage.setItem(CLIENT_KEY, JSON.stringify(data.client));
          setSessionToken(data.sessionToken);
          // Clean the URL
          window.history.replaceState({}, "", "/my-events");
        })
        .catch((err) => {
          toast({ title: "Login failed", description: err.message, variant: "destructive" });
        })
        .finally(() => setVerifying(false));
    }
  }, [magicToken]);

  // Fetch portal data
  const { data: portalData, isLoading, isError } = useQuery<PortalData>({
    queryKey: ["/api/public/portal/data", sessionToken],
    queryFn: async () => {
      const res = await fetch("/api/public/portal/data", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(CLIENT_KEY);
          setSessionToken(null);
          throw new Error("Session expired");
        }
        throw new Error("Failed to load");
      }
      return res.json();
    },
    enabled: !!sessionToken,
  });

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(CLIENT_KEY);
    setSessionToken(null);
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
        <p className="ml-3 text-gray-600">Verifying your login...</p>
      </div>
    );
  }

  if (!sessionToken) {
    return <LoginScreen />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (isError || !portalData) {
    return <LoginScreen />;
  }

  return <PortalDashboard data={portalData} onLogout={handleLogout} />;
}
