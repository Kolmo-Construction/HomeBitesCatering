/**
 * Client Timeline: Unified communication history for a client.
 * Shows all interactions (email, call, SMS, in-person, web chat, hand-written notes, WhatsApp)
 * plus milestones (quotes, events, status changes) in one chronological feed.
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
  MessageCircle,
  PenTool,
  Globe,
  ArrowDownLeft,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineEntry {
  id: string;
  type: string;
  channel?: string;
  direction?: string;
  timestamp: string;
  title: string;
  detail?: string;
  entityType?: string;
  entityId?: number;
}

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  call: Phone,
  sms: MessageSquare,
  note: StickyNote,
  meeting: Users,
  in_person: Users,
  web_chat: Globe,
  hand_written: PenTool,
  whatsapp: MessageCircle,
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  call: "Phone Call",
  sms: "SMS",
  note: "Note",
  meeting: "Meeting",
  in_person: "In Person",
  web_chat: "Web Chat",
  hand_written: "Hand Written",
  whatsapp: "WhatsApp",
};

const TYPE_COLORS: Record<string, string> = {
  communication: "bg-blue-500",
  status_change: "bg-purple-500",
  milestone: "bg-amber-500",
};

const DIRECTION_ICON: Record<string, typeof ArrowDownLeft> = {
  incoming: ArrowDownLeft,
  outgoing: ArrowUpRight,
  internal: Minus,
};

function getEntityLink(entry: TimelineEntry): string | null {
  if (!entry.entityType || !entry.entityId) return null;
  switch (entry.entityType) {
    case "opportunity": return `/opportunities/${entry.entityId}`;
    case "quote": return `/quotes/${entry.entityId}/view`;
    case "event": return `/events/${entry.entityId}`;
    case "inquiry": return `/inquiries`;
    default: return null;
  }
}

function TimelineIcon({ entry }: { entry: TimelineEntry }) {
  // Milestones get special icons
  if (entry.type === "milestone") {
    if (entry.id.startsWith("est-accepted")) return <CheckCircle className="h-3.5 w-3.5 text-white" />;
    if (entry.id.startsWith("est-declined")) return <XCircle className="h-3.5 w-3.5 text-white" />;
    if (entry.id.startsWith("est-sent")) return <Send className="h-3.5 w-3.5 text-white" />;
    if (entry.id.startsWith("est-viewed")) return <Eye className="h-3.5 w-3.5 text-white" />;
    if (entry.id.startsWith("event-")) return <Calendar className="h-3.5 w-3.5 text-white" />;
    if (entry.id.startsWith("qr-")) return <FileText className="h-3.5 w-3.5 text-white" />;
    return <Zap className="h-3.5 w-3.5 text-white" />;
  }
  if (entry.type === "status_change") return <ArrowRightCircle className="h-3.5 w-3.5 text-white" />;

  // Communications get channel-specific icons
  const Icon = CHANNEL_ICON[entry.channel || "note"] || MessageSquare;
  return <Icon className="h-3.5 w-3.5 text-white" />;
}

function getDotColor(entry: TimelineEntry): string {
  if (entry.type === "milestone") {
    if (entry.id.startsWith("est-accepted") || entry.id.startsWith("event-")) return "bg-green-500";
    if (entry.id.startsWith("est-declined")) return "bg-red-400";
    if (entry.id.startsWith("est-sent") || entry.id.startsWith("est-created")) return "bg-yellow-500";
    return "bg-amber-500";
  }
  return TYPE_COLORS[entry.type] || "bg-gray-400";
}

export default function ClientTimeline({ clientId }: { clientId: number }) {
  const { data, isLoading, error } = useQuery<{
    client: { id: number; firstName: string; lastName: string; email: string };
    totalEntries: number;
    timeline: TimelineEntry[];
  }>({
    queryKey: ["/api/clients", clientId, "timeline"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/timeline`);
      if (!res.ok) throw new Error("Failed to fetch timeline");
      return res.json();
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-gray-400">Loading timeline...</div>;
  }

  if (error || !data || data.timeline.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        No activity recorded yet. Log a call, note, or email to get started.
      </div>
    );
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
      <div className="text-xs text-gray-500 mb-2">
        {data.totalEntries} interaction{data.totalEntries !== 1 ? "s" : ""}
      </div>
      {Object.entries(groupedByDate).map(([dateKey, entries]) => (
        <div key={dateKey}>
          <div className="text-xs font-semibold text-gray-500 mb-2 sticky top-0 bg-white py-1 z-10">
            {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
          </div>
          <div className="relative pl-6 border-l-2 border-gray-200 space-y-3">
            {entries.map((entry) => {
              const link = getEntityLink(entry);
              const dotColor = getDotColor(entry);
              const DirIcon = entry.direction ? DIRECTION_ICON[entry.direction] : null;

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
                    entry.id.startsWith("est-accepted") && "bg-green-50 border-green-200",
                    entry.id.startsWith("event-") && "bg-emerald-50 border-emerald-200",
                    entry.id.startsWith("est-declined") && "bg-red-50 border-red-200",
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{entry.title}</span>
                        {DirIcon && (
                          <DirIcon className={cn(
                            "h-3 w-3",
                            entry.direction === "incoming" ? "text-blue-500" : entry.direction === "outgoing" ? "text-green-500" : "text-gray-400"
                          )} />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {entry.type === "communication" && entry.channel && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {CHANNEL_LABEL[entry.channel] || entry.channel}
                          </Badge>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(entry.timestamp), "h:mm a")}
                        </span>
                      </div>
                    </div>
                    {entry.detail && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{entry.detail}</div>
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
