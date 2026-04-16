import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, X, Eye, Clock, Mail, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface FollowUpDraft {
  id: number;
  type: string;
  opportunityId: number | null;
  estimateId: number | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  status: string;
  triggerReason: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  inquiry_not_opened: "Inquiry not opened",
  inquiry_not_submitted: "Inquiry not submitted",
  quote_not_viewed: "Quote not viewed",
  quote_no_action: "Quote no action",
  quote_expiring_soon: "Quote expiring",
  opportunity_stale: "Stale opportunity",
};

const TYPE_ICONS: Record<string, typeof Mail> = {
  inquiry_not_opened: Mail,
  inquiry_not_submitted: FileText,
  quote_not_viewed: Eye,
  quote_no_action: Clock,
  quote_expiring_soon: Clock,
  opportunity_stale: Clock,
};

export default function PendingFollowUps() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewDraft, setPreviewDraft] = useState<FollowUpDraft | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBodyText, setEditBodyText] = useState("");

  const { data: drafts = [], isLoading } = useQuery<FollowUpDraft[]>({
    queryKey: ["/api/follow-up-drafts", { status: "pending" }],
    queryFn: async () => {
      const res = await fetch("/api/follow-up-drafts?status=pending");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const res = await fetch(`/api/follow-up-drafts/${draftId}/send`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-drafts"] });
      toast({ title: "Follow-up sent", description: "Email sent to customer." });
      setPreviewDraft(null);
    },
    onError: () => {
      toast({ title: "Failed to send", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const res = await fetch(`/api/follow-up-drafts/${draftId}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to cancel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-drafts"] });
      toast({ title: "Draft dismissed" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ draftId, subject, bodyText }: { draftId: number; subject: string; bodyText: string }) => {
      const res = await fetch(`/api/follow-up-drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyText, status: "edited" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-drafts"] });
      toast({ title: "Draft updated" });
      setPreviewDraft(null);
    },
  });

  const openPreview = (draft: FollowUpDraft) => {
    setPreviewDraft(draft);
    setEditSubject(draft.subject);
    setEditBodyText(draft.bodyText);
  };

  if (isLoading || drafts.length === 0) return null;

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-600" />
              Pending Follow-Ups
            </span>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {drafts.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {drafts.slice(0, 5).map((draft) => {
            const Icon = TYPE_ICONS[draft.type] || Mail;
            return (
              <div
                key={draft.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-100 hover:border-amber-200 transition"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Icon className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {draft.recipientName || draft.recipientEmail}
                    </div>
                    <div className="text-xs text-gray-500">
                      {TYPE_LABELS[draft.type] || draft.type} · {draft.triggerReason}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button size="sm" variant="ghost" onClick={() => openPreview(draft)} title="Review">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => sendMutation.mutate(draft.id)}
                    disabled={sendMutation.isPending}
                    title="Send now"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => cancelMutation.mutate(draft.id)}
                    disabled={cancelMutation.isPending}
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {drafts.length > 5 && (
            <div className="text-xs text-center text-gray-500 pt-1">
              + {drafts.length - 5} more pending follow-ups
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview / Edit Dialog */}
      <Dialog open={!!previewDraft} onOpenChange={(open) => !open && setPreviewDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Follow-Up Email</DialogTitle>
            <DialogDescription>
              Review and optionally edit before sending to{" "}
              <span className="font-medium">{previewDraft?.recipientEmail}</span>
            </DialogDescription>
          </DialogHeader>

          {previewDraft && (
            <div className="space-y-4">
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                {previewDraft.triggerReason}
              </div>

              <div>
                <Label>Subject</Label>
                <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
              </div>

              <div>
                <Label>Message (plain text)</Label>
                <Textarea
                  value={editBodyText}
                  onChange={(e) => setEditBodyText(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewDraft(null)}>
              Close
            </Button>
            {(editSubject !== previewDraft?.subject || editBodyText !== previewDraft?.bodyText) && (
              <Button
                variant="secondary"
                onClick={() =>
                  previewDraft &&
                  editMutation.mutate({ draftId: previewDraft.id, subject: editSubject, bodyText: editBodyText })
                }
                disabled={editMutation.isPending}
              >
                Save Edits
              </Button>
            )}
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => previewDraft && sendMutation.mutate(previewDraft.id)}
              disabled={sendMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendMutation.isPending ? "Sending..." : "Send Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
