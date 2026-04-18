/**
 * Tier 2, Item 8: Unified Contact Timeline
 *
 * Reusable component that shows all touchpoints for a contact across the funnel.
 * Embedded in Opportunity, Client, and Event detail pages.
 */
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "wouter";
import {
  Mail,
  Phone,
  MessageSquare,
  StickyNote,
  Users,
  ArrowRightCircle,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineEntry {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  detail?: string;
  entityType?: string;
  entityId?: number;
  icon?: string;
}

const ICON_MAP: Record<string, typeof Mail> = {
  email: Mail,
  call: Phone,
  sms: MessageSquare,
  note: StickyNote,
  meeting: Users,
  system: Zap,
};

const TYPE_COLORS: Record<string, string> = {
  communication: "bg-blue-500",
  status_change: "bg-purple-500",
  quote_submitted: "bg-orange-500",
  quote_sent: "bg-yellow-500",
  quote_accepted: "bg-green-500",
  event_created: "bg-emerald-600",
  system: "bg-gray-400",
};

function getEntityLink(entry: TimelineEntry): string | null {
  if (!entry.entityType || !entry.entityId) return null;
  switch (entry.entityType) {
    case "opportunity": return `/opportunities/${entry.entityId}`;
    case "client": return `/clients/${entry.entityId}`;
    case "quote": return `/quotes/${entry.entityId}/view`;
    case "event": return `/events/${entry.entityId}`;
    case "inquiry": return `/inquiries`;
    default: return null;
  }
}

function TimelineIcon({ entry }: { entry: TimelineEntry }) {
  const Icon = ICON_MAP[entry.icon || "system"] || Zap;

  if (entry.type === "quote_accepted") return <CheckCircle className="h-3.5 w-3.5 text-white" />;
  if (entry.type === "quote_sent") return <Send className="h-3.5 w-3.5 text-white" />;
  if (entry.type === "event_created") return <Calendar className="h-3.5 w-3.5 text-white" />;
  if (entry.type === "quote_submitted") return <FileText className="h-3.5 w-3.5 text-white" />;
  if (entry.type === "status_change") return <ArrowRightCircle className="h-3.5 w-3.5 text-white" />;

  return <Icon className="h-3.5 w-3.5 text-white" />;
}

export default function ContactTimeline({ email }: { email: string }) {
  const { data, isLoading, error } = useQuery<{ email: string; totalEntries: number; timeline: TimelineEntry[] }>({
    queryKey: ["/api/contacts", email, "timeline"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${encodeURIComponent(email)}/timeline`);
      if (!res.ok) throw new Error("Failed to fetch timeline");
      return res.json();
    },
    enabled: !!email,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-gray-400">Loading timeline...</div>;
  }

  if (error || !data || data.timeline.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-400">No activity recorded for this contact.</div>;
  }

  // Group by date
  const groupedByDate: Record<string, TimelineEntry[]> = {};
  for (const entry of data.timeline) {
    const dateKey = format(new Date(entry.timestamp), "yyyy-MM-dd");
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(entry);
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-gray-500 mb-2">{data.totalEntries} events for {email}</div>
      {Object.entries(groupedByDate).map(([dateKey, entries]) => (
        <div key={dateKey}>
          <div className="text-xs font-semibold text-gray-500 mb-2 sticky top-0 bg-white py-1">
            {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
          </div>
          <div className="relative pl-6 border-l-2 border-gray-200 space-y-3">
            {entries.map((entry) => {
              const link = getEntityLink(entry);
              const dotColor = TYPE_COLORS[entry.type] || "bg-gray-400";

              const content = (
                <div className="relative group">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute -left-[31px] top-1 w-5 h-5 rounded-full flex items-center justify-center",
                    dotColor
                  )}>
                    <TimelineIcon entry={entry} />
                  </div>
                  <div className={cn(
                    "p-2.5 rounded-lg border transition",
                    link ? "hover:bg-gray-50 cursor-pointer" : "",
                    entry.type === "quote_accepted" && "bg-green-50 border-green-200",
                    entry.type === "event_created" && "bg-emerald-50 border-emerald-200"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{entry.title}</div>
                      <div className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {format(new Date(entry.timestamp), "h:mm a")}
                      </div>
                    </div>
                    {entry.detail && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{entry.detail}</div>
                    )}
                    {entry.entityType && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 mt-1 capitalize">
                        {entry.entityType}
                      </Badge>
                    )}
                  </div>
                </div>
              );

              return link ? (
                <Link key={entry.id} href={link}>{content}</Link>
              ) : (
                <div key={entry.id}>{content}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
