import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, MessageSquare, Send, Copy, Check } from "lucide-react";

// Prefill props make this reusable:
//  - from /clients/:id header (prefill from the client)
//  - from /clients list (blank for a walk-in)
// The backend owns token generation and channel fan-out; the dialog just
// collects data + shows the result.
export interface SendInquiryDialogProps {
  trigger: React.ReactNode;
  prefillFirstName?: string;
  prefillLastName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  clientId?: number;
}

interface InviteResponse {
  id: number;
  token: string;
  inquiryUrl: string;
  emailSent: boolean;
  emailError?: string;
  smsQueued: boolean;
}

export default function SendInquiryDialog(props: SendInquiryDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [firstName, setFirstName] = useState(props.prefillFirstName || "");
  const [lastName, setLastName] = useState(props.prefillLastName || "");
  const [email, setEmail] = useState(props.prefillEmail || "");
  const [phone, setPhone] = useState(props.prefillPhone || "");
  const [eventType, setEventType] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [sendViaSms, setSendViaSms] = useState(false);

  const [result, setResult] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setFirstName(props.prefillFirstName || "");
    setLastName(props.prefillLastName || "");
    setEmail(props.prefillEmail || "");
    setPhone(props.prefillPhone || "");
    setEventType("");
    setPersonalNote("");
    setSendViaEmail(true);
    setSendViaSms(false);
    setResult(null);
    setCopied(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inquiry-invites", {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        eventType: eventType.trim() || null,
        clientId: props.clientId || null,
        sendViaEmail,
        sendViaSms,
        personalNote: personalNote.trim() || undefined,
      });
      return (await res.json()) as InviteResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      const channels = [data.emailSent && "email", data.smsQueued && "SMS"].filter(Boolean).join(" + ");
      toast({
        title: "Inquiry sent",
        description: `${firstName} will receive the link via ${channels || "no channel (error?)"}.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send inquiry",
        description: err?.message || "Check the console for details.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    firstName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    (sendViaEmail || sendViaSms) &&
    (!sendViaSms || phone.trim().length >= 7);

  const copyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inquiryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Send Inquiry
          </DialogTitle>
          <DialogDescription>
            Email or text the customer a link to fill out the inquiry form. Use
            this for leads who came in by phone, in person, or referral.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              Invite created for <strong>{firstName} {lastName}</strong>.
              {result.emailSent && <div>✓ Email sent to {email}</div>}
              {result.smsQueued && <div>✓ SMS sent to {phone}</div>}
              {!result.emailSent && sendViaEmail && (
                <div className="text-amber-700">⚠ Email may not have sent: {result.emailError || "check logs"}</div>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-500">Inquiry link (shareable)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input readOnly value={result.inquiryUrl} className="text-xs font-mono" />
                <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setResult(null); }}>
                Send another
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="inv-first">First name *</Label>
                <Input id="inv-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="inv-last">Last name</Label>
                <Input id="inv-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="inv-email">Email *</Label>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="inv-phone">Phone {sendViaSms && <span className="text-red-600">*</span>}</Label>
              <Input id="inv-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="inv-event-type">Event type (optional)</Label>
              <Input
                id="inv-event-type"
                placeholder="wedding, corporate, birthday..."
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="inv-note">Personal note (optional — included in email)</Label>
              <Textarea
                id="inv-note"
                placeholder="Great meeting you last night! Here's the form to get your quote started..."
                rows={2}
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
              />
            </div>

            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs text-gray-500">Send via</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={sendViaEmail} onCheckedChange={(c) => setSendViaEmail(!!c)} />
                  <Mail className="h-4 w-4" /> Email
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={sendViaSms} onCheckedChange={(c) => setSendViaSms(!!c)} />
                  <MessageSquare className="h-4 w-4" /> SMS
                </label>
              </div>
              {sendViaSms && phone.trim().length < 7 && (
                <p className="text-xs text-red-600">Phone number required to send via SMS</p>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || mutation.isPending}>
                {mutation.isPending ? "Sending..." : "Send Inquiry"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
