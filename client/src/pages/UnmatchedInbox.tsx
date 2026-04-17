/**
 * Unmatched Communications Inbox
 * Shows communications that couldn't be auto-matched to any client.
 * Allows manual assignment to existing clients or creation of new ones.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  Mail,
  Phone,
  MessageSquare,
  StickyNote,
  Users,
  Globe,
  MessageCircle,
  PenTool,
  Link2,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

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

interface Communication {
  id: number;
  type: string;
  direction: string;
  timestamp: string;
  subject: string | null;
  fromAddress: string | null;
  toAddress: string | null;
  bodySummary: string | null;
  bodyRaw: string | null;
  source: string | null;
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export default function UnmatchedInbox() {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unmatched = [], isLoading } = useQuery<Communication[]>({
    queryKey: ["/api/communications/unmatched"],
    queryFn: async () => {
      const res = await fetch("/api/communications/unmatched");
      if (!res.ok) throw new Error("Failed to fetch unmatched communications");
      return res.json();
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
    enabled: assignDialogOpen,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ commId, clientId }: { commId: number; clientId: number }) => {
      return apiRequest("POST", `/api/communications/${commId}/assign`, { clientId });
    },
    onSuccess: () => {
      toast({ title: "Communication assigned to client" });
      queryClient.invalidateQueries({ queryKey: ["/api/communications/unmatched"] });
      setAssignDialogOpen(false);
      setSelectedComm(null);
    },
    onError: () => {
      toast({ title: "Failed to assign communication", variant: "destructive" });
    },
  });

  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Unmatched Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          These communications couldn't be auto-matched to any client. Assign them manually.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-purple"></div>
        </div>
      ) : unmatched.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">All communications are matched. Nothing here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{unmatched.length} unmatched message{unmatched.length !== 1 ? "s" : ""}</p>
          {unmatched.map((comm) => {
            const Icon = CHANNEL_ICON[comm.type] || MessageSquare;
            return (
              <Card key={comm.id} className="hover:shadow-sm transition">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="bg-blue-100 rounded-full p-2 shrink-0">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {comm.subject || `${CHANNEL_LABEL[comm.type] || comm.type} (${comm.direction})`}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {CHANNEL_LABEL[comm.type] || comm.type}
                          </Badge>
                          {comm.direction === "incoming" && (
                            <ArrowDownLeft className="h-3 w-3 text-blue-500" />
                          )}
                          {comm.direction === "outgoing" && (
                            <ArrowUpRight className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                        {(comm.fromAddress || comm.toAddress) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {comm.direction === "incoming" ? `From: ${comm.fromAddress}` : `To: ${comm.toAddress}`}
                          </p>
                        )}
                        {(comm.bodySummary || comm.bodyRaw) && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {comm.bodySummary || comm.bodyRaw?.substring(0, 150)}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {format(new Date(comm.timestamp), "MMM d, yyyy h:mm a")}
                          {comm.source && ` via ${comm.source}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        setSelectedComm(comm);
                        setAssignDialogOpen(true);
                        setClientSearch("");
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign to client dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to Client</DialogTitle>
          </DialogHeader>
          {selectedComm && (
            <div className="text-sm text-gray-500 mb-3 p-2 bg-gray-50 rounded">
              {selectedComm.subject || `${selectedComm.type} (${selectedComm.direction})`}
              {selectedComm.fromAddress && <span className="block text-xs">From: {selectedComm.fromAddress}</span>}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients by name, email, or phone..."
              className="pl-9"
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 mt-2">
            {filteredClients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No clients found</p>
            ) : (
              filteredClients.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left p-2 rounded hover:bg-gray-50 flex items-center justify-between text-sm"
                  onClick={() => selectedComm && assignMutation.mutate({ commId: selectedComm.id, clientId: c.id })}
                  disabled={assignMutation.isPending}
                >
                  <div>
                    <span className="font-medium">{c.firstName} {c.lastName}</span>
                    <span className="text-gray-400 ml-2">{c.email}</span>
                  </div>
                  {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
