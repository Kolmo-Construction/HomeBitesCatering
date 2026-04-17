/**
 * Dialog for logging a new communication (call, note, meeting, etc.) against a client.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

const COMM_TYPES = [
  { value: "call", label: "Phone Call" },
  { value: "note", label: "Internal Note" },
  { value: "sms", label: "SMS / Text" },
  { value: "meeting", label: "Meeting" },
  { value: "in_person", label: "In Person" },
  { value: "web_chat", label: "Web Chat" },
  { value: "hand_written", label: "Hand Written Note" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email (manual)" },
];

const DIRECTIONS = [
  { value: "incoming", label: "Incoming" },
  { value: "outgoing", label: "Outgoing" },
  { value: "internal", label: "Internal" },
];

interface LogCommunicationDialogProps {
  clientId: number;
  opportunityId?: number;
}

export default function LogCommunicationDialog({ clientId, opportunityId }: LogCommunicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("call");
  const [direction, setDirection] = useState("incoming");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/communications", {
        clientId,
        opportunityId: opportunityId || null,
        type,
        direction,
        subject: subject || null,
        bodySummary: body || null,
        timestamp: new Date().toISOString(),
        source: "manual_entry",
      });
    },
    onSuccess: () => {
      toast({ title: "Communication logged" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "timeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "communications"] });
      setOpen(false);
      setSubject("");
      setBody("");
      setType("call");
      setDirection("incoming");
    },
    onError: () => {
      toast({ title: "Failed to log communication", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Log Interaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Communication</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMM_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Subject (optional)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Discussed menu options"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What was discussed? Any important details..."
              rows={4}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Log Communication"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
