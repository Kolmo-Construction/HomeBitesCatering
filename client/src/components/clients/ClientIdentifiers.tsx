/**
 * Manage contact identifiers (emails, phones, handles) for a client.
 * Allows viewing, adding, and removing identifiers used by the matching engine.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, MessageSquare, Globe, MessageCircle, Plus, X, Star } from "lucide-react";

const TYPE_ICON: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  instagram: Globe,
  web_chat: Globe,
  other: Globe,
};

const TYPE_LABEL: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  sms: "SMS",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  web_chat: "Web Chat",
  other: "Other",
};

interface ContactIdentifier {
  id: number;
  clientId: number | null;
  opportunityId: number | null;
  type: string;
  value: string;
  label: string | null;
  isPrimary: boolean;
  verified: boolean;
  source: string | null;
  createdAt: string;
}

export default function ClientIdentifiers({ clientId }: { clientId: number }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState("email");
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: identifiers = [], isLoading } = useQuery<ContactIdentifier[]>({
    queryKey: ["/api/clients", clientId, "contact-identifiers"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/contact-identifiers`);
      if (!res.ok) throw new Error("Failed to fetch identifiers");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/contact-identifiers", {
        clientId,
        type: newType,
        value: newValue.trim(),
        label: newLabel.trim() || null,
        isPrimary: identifiers.length === 0,
        verified: false,
        source: "manual_entry",
      });
    },
    onSuccess: () => {
      toast({ title: "Identifier added" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contact-identifiers"] });
      setNewValue("");
      setNewLabel("");
      setShowAdd(false);
    },
    onError: () => {
      toast({ title: "Failed to add identifier", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/contact-identifiers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Identifier removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contact-identifiers"] });
    },
    onError: () => {
      toast({ title: "Failed to remove identifier", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Known Identifiers</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          Used to auto-match incoming calls, emails, and messages to this client
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : identifiers.length === 0 && !showAdd ? (
          <p className="text-sm text-gray-400">No identifiers yet. Add an email or phone to enable auto-matching.</p>
        ) : (
          <ul className="space-y-2">
            {identifiers.map((id) => {
              const Icon = TYPE_ICON[id.type] || Globe;
              return (
                <li key={id.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{id.value}</span>
                    {id.isPrimary && <Star className="h-3 w-3 text-yellow-500 shrink-0" />}
                    {id.label && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                        {id.label}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => deleteMutation.mutate(id.id)}
                  >
                    <X className="h-3 w-3 text-gray-400" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {showAdd && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="flex gap-2">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABEL).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={newType === "email" ? "name@example.com" : newType === "phone" ? "+1-555-123-4567" : "handle or identifier"}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (optional, e.g. Work email)"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => addMutation.mutate()}
                disabled={!newValue.trim() || addMutation.isPending}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
