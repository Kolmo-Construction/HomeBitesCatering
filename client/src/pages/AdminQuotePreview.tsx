// Admin view of the customer-facing proposal. Renders QuoteProposalView in
// preview mode so Mike sees exactly what the couple will see, with a sticky
// admin bar on top offering Customize (opens the ProposalEditDrawer) and
// Send to customer (opens the confirm-then-send dialog).

import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, XCircle, CheckIcon, CopyIcon, LinkIcon, MailIcon, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import QuoteProposalView from "@/components/quotes/QuoteProposalView";
import ProposalEditDrawer from "@/components/quotes/ProposalEditDrawer";
import VersionHistory from "@/components/quotes/VersionHistory";
import type { Proposal } from "@shared/proposal";

interface PreviewPayload {
  quote: {
    id: number;
    status: "draft" | "sent" | "viewed" | "accepted" | "declined";
    sentAt: string | null;
    viewedAt: string | null;
    acceptedAt: string | null;
    declinedAt: string | null;
  };
  client: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  proposal: Proposal;
}

interface Props {
  id: number;
}

export default function AdminQuotePreview({ id }: Props) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sentPublicUrl, setSentPublicUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sentEmailAuto, setSentEmailAuto] = useState(false);
  const [sentEmailRecipient, setSentEmailRecipient] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<PreviewPayload>({
    queryKey: ["/api/quotes", id, "preview"],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${id}/preview`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to load preview");
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 0,
  });

  const saveProposalMutation = useMutation({
    mutationFn: async (proposal: Proposal) => {
      const res = await apiRequest(
        "PATCH",
        `/api/quotes/${id}/proposal`,
        proposal,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", id, "preview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Saved", description: "Proposal updated." });
      setDrawerOpen(false);
    },
    onError: (e: Error) => {
      toast({
        title: "Save failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quotes/${id}/send`);
      return res.json() as Promise<{
        publicUrl: string;
        emailSent: boolean;
        emailRecipient: string | null;
      }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", id, "preview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setSentPublicUrl(result.publicUrl);
      setSentEmailAuto(result.emailSent === true);
      setSentEmailRecipient(result.emailRecipient ?? null);
      setLinkCopied(false);
      if (result.emailSent) {
        toast({
          title: "Email sent",
          description: `Quote sent to ${result.emailRecipient}.`,
        });
      }
    },
    onError: (e: Error) => {
      toast({
        title: "Send failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = async () => {
    if (!sentPublicUrl) return;
    try {
      await navigator.clipboard.writeText(sentPublicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Select and copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleOpenEmailDraft = () => {
    if (!sentPublicUrl || !data?.client?.email) return;
    const subject = encodeURIComponent("Your Homebites catering quote");
    const body = encodeURIComponent(
      `Hi ${data.client.firstName || ""},\n\n` +
        `Thanks for reaching out to Homebites! Your quote is ready. You can review it and accept or decline here:\n\n` +
        `${sentPublicUrl}\n\n` +
        `Let us know if you have any questions.\n\n` +
        `— Homebites Catering`,
    );
    window.location.href = `mailto:${data.client.email}?subject=${subject}&body=${body}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex flex-col items-center justify-center text-stone-500">
        <Loader2 className="h-10 w-10 animate-spin mb-3" />
        <p>Loading proposal…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#fbf6ea] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-rose-200 p-12 text-center shadow-sm max-w-md">
          <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-serif font-semibold mb-1">Couldn&rsquo;t load preview</h2>
          <p className="text-stone-600">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/quotes")}>
            Back to Quotes
          </Button>
        </div>
      </div>
    );
  }

  const canSend = data.quote.status !== "accepted" && data.quote.status !== "declined";
  const sendLabel =
    data.quote.status === "draft"
      ? "Send to customer"
      : "Resend / Copy link";

  const previewSubtitle =
    data.quote.status === "sent"
      ? "Quote sent — this is the live customer view."
      : data.quote.status === "viewed"
      ? "Customer has viewed this."
      : data.quote.status === "accepted"
      ? "Accepted — couple is booked."
      : data.quote.status === "declined"
      ? "Customer declined."
      : "Draft — not sent yet. This is exactly what the customer will see.";

  return (
    <>
      <QuoteProposalView
        proposal={data.proposal}
        quoteStatus={data.quote.status}
        mode="preview"
        previewSubtitle={previewSubtitle}
        onBack={() => navigate("/quotes")}
        onEdit={() => setDrawerOpen(true)}
        onSend={canSend ? () => setSendDialogOpen(true) : undefined}
        sendLabel={sendLabel}
        sendDisabled={sendMutation.isPending}
      />

      {/* Tier 3: PDF Download + Version history */}
      <div className="max-w-3xl mx-auto px-6 pb-6 space-y-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/quotes/${id}/pdf`, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
        <VersionHistory quoteId={id} currentTotal={data.proposal?.pricing?.totalCents} />
      </div>

      <ProposalEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initialProposal={data.proposal}
        isSaving={saveProposalMutation.isPending}
        onSave={(next) => saveProposalMutation.mutate(next)}
      />

      <AlertDialog
        open={sendDialogOpen}
        onOpenChange={(open) => {
          setSendDialogOpen(open);
          if (!open) {
            setSentPublicUrl(null);
            setLinkCopied(false);
            setSentEmailAuto(false);
            setSentEmailRecipient(null);
          }
        }}
      >
        <AlertDialogContent>
          {!sentPublicUrl ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Send quote to {data.client?.firstName ?? "customer"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You&rsquo;re looking at exactly what the customer will see. Make sure
                  the menu, pricing, and special requests are right — you can always{" "}
                  <strong>Customize</strong> to change anything before sending.
                  <br />
                  <br />
                  Sending generates a private link, stamps the quote as sent, and
                  {data.client?.email ? " emails it automatically." : " gives you a link to share."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={sendMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    sendMutation.mutate();
                  }}
                  className="bg-gradient-to-br from-[#8B7355] to-[#E28C0A]"
                  disabled={sendMutation.isPending}
                >
                  {sendMutation.isPending ? "Sending…" : "Send quote"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {sentEmailAuto ? "Quote sent ✨" : "Your customer link is ready"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {sentEmailAuto ? (
                    <>
                      We emailed the quote to <strong>{sentEmailRecipient}</strong>.
                      You&rsquo;ll get a notification when they view it. The link
                      below is the same one they received.
                    </>
                  ) : (
                    <>
                      Copy this link and send it to{" "}
                      {data.client?.firstName ?? "the customer"}. They don&rsquo;t
                      need to log in — they just click, review, and accept or decline.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-4 space-y-3">
                {sentEmailAuto && (
                  <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                    <CheckIcon className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-emerald-900">
                      Sent automatically via email to {sentEmailRecipient}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border">
                  <LinkIcon className="h-4 w-4 text-gray-500 shrink-0" />
                  <code className="flex-1 text-xs text-gray-800 break-all select-all">
                    {sentPublicUrl}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
                    <CopyIcon className="h-4 w-4 mr-2" />
                    {linkCopied ? "Copied!" : "Copy Link"}
                  </Button>
                  {data.client?.email && !sentEmailAuto && (
                    <Button
                      className="flex-1 bg-gradient-to-br from-[#8B7355] to-[#E28C0A]"
                      onClick={handleOpenEmailDraft}
                    >
                      <MailIcon className="h-4 w-4 mr-2" />
                      Open Email Draft
                    </Button>
                  )}
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogAction
                  onClick={() => {
                    setSendDialogOpen(false);
                    setSentPublicUrl(null);
                  }}
                >
                  Done
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
