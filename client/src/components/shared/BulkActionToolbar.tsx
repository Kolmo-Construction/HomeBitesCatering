/**
 * Tier 4, Item 16: Bulk Action Toolbar
 *
 * Floating toolbar that appears when items are selected in a list.
 * Provides context-appropriate bulk actions.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Archive, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BulkActionToolbarProps {
  selectedIds: number[];
  entityType: "opportunity" | "estimate" | "client";
  onClearSelection: () => void;
  invalidateKeys?: string[];
}

export default function BulkActionToolbar({
  selectedIds,
  entityType,
  onClearSelection,
  invalidateKeys = [],
}: BulkActionToolbarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const bulkMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      const res = await fetch(`/api/${entityType === "opportunity" ? "opportunities" : entityType === "estimate" ? "estimates" : "clients"}/bulk-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action }),
      });
      if (!res.ok) throw new Error("Bulk action failed");
      return res.json();
    },
    onSuccess: (data, { action }) => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast({ title: `${data.processed} items ${action === "delete" ? "deleted" : action === "archive" ? "archived" : "updated"}` });
      onClearSelection();
      setConfirmAction(null);
    },
    onError: () => {
      toast({ title: "Action failed", variant: "destructive" });
      setConfirmAction(null);
    },
  });

  if (selectedIds.length === 0) return null;

  const actions = [];

  if (entityType === "opportunity") {
    actions.push({ key: "archive", label: "Archive", icon: Archive, destructive: false });
  }
  actions.push({ key: "delete", label: "Delete", icon: Trash2, destructive: true });

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-2.5 flex items-center gap-3">
        <Badge variant="secondary" className="px-2">
          {selectedIds.length} selected
        </Badge>

        {actions.map(({ key, label, icon: Icon, destructive }) => (
          <Button
            key={key}
            size="sm"
            variant={destructive ? "destructive" : "outline"}
            onClick={() => {
              if (destructive) {
                setConfirmAction(key);
              } else {
                bulkMutation.mutate({ action: key });
              }
            }}
            disabled={bulkMutation.isPending}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {label}
          </Button>
        ))}

        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete" ? "Delete" : "Process"} {selectedIds.length} items?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete"
                ? "These items will be soft-deleted and can be restored later."
                : `This action will ${confirmAction} the selected items.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction === "delete" ? "bg-red-600 hover:bg-red-700" : ""}
              onClick={() => confirmAction && bulkMutation.mutate({ action: confirmAction })}
            >
              {bulkMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
