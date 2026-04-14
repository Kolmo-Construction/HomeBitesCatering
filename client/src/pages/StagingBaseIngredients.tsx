import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Check,
  X,
  Pencil,
  Undo2,
  ArrowRight,
  ChefHat,
  Info,
  AlertTriangle,
  ShoppingBasket,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StagingStatus = "pending" | "approved" | "rejected" | "modified" | "promoted";

interface StagingRow {
  id: number;
  name: string;
  suggested_category: string;
  suggested_purchase_unit: string;
  suggested_purchase_quantity: string | number;
  suggested_price: string | number;
  suggested_dietary_tags: string[] | null;
  ai_reasoning: string | null;
  reference_count: number;
  sample_recipes: string[];
  status: StagingStatus;
  reviewer_notes: string | null;
  approved_as_id: number | null;
  source: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "beverages", label: "Beverages" },
  { value: "dairy", label: "Dairy" },
  { value: "dry_goods", label: "Dry Goods" },
  { value: "meat", label: "Meat" },
  { value: "produce", label: "Produce" },
  { value: "seafood", label: "Seafood" },
  { value: "spices", label: "Spices" },
  { value: "other", label: "Other" },
];

const PURCHASE_UNITS = [
  { value: "each", label: "Each" },
  { value: "pound", label: "Pound (lb)" },
  { value: "ounce", label: "Ounce (oz)" },
  { value: "kilogram", label: "Kilogram (kg)" },
  { value: "gallon", label: "Gallon" },
  { value: "liter", label: "Liter" },
];

function formatMoney(v: string | number) {
  const n = typeof v === "number" ? v : parseFloat(v || "0");
  if (Number.isNaN(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function statusBadgeClass(status: StagingStatus) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "approved":
      return "bg-green-100 text-green-800 border-green-300";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-300";
    case "modified":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "promoted":
      return "bg-purple-100 text-purple-800 border-purple-300";
    default:
      return "";
  }
}

export default function StagingBaseIngredientsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | StagingStatus>("pending");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<StagingRow>>({});
  const [confirmingPromote, setConfirmingPromote] = useState(false);

  const { data: rows = [], isLoading } = useQuery<StagingRow[]>({
    queryKey: ["/api/ingredients/staging-base-ingredients"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<StagingRow> }) => {
      const res = await apiRequest("PATCH", `/api/ingredients/staging-base-ingredients/${id}`, patch);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/staging-base-ingredients"] });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ingredients/staging-base-ingredients/promote`, {});
      return await res.json();
    },
    onSuccess: (data: { promoted: number; failed: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/staging-base-ingredients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/base-ingredients"] });
      toast({
        title: "Promoted",
        description: `${data.promoted} new base ingredients created${data.failed ? `, ${data.failed} failed` : ""}.`,
      });
      setConfirmingPromote(false);
    },
    onError: (err: any) => {
      toast({ title: "Promote failed", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, approved: 0, rejected: 0, modified: 0, promoted: 0 };
    for (const r of rows) {
      c[r.status] = (c[r.status] || 0) + 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const readyToPromoteCount = counts.approved + counts.modified;

  function startEdit(row: StagingRow) {
    setEditingId(row.id);
    setEditDraft({
      name: row.name,
      suggested_category: row.suggested_category,
      suggested_purchase_unit: row.suggested_purchase_unit,
      suggested_purchase_quantity: row.suggested_purchase_quantity,
      suggested_price: row.suggested_price,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }

  async function saveEdit(row: StagingRow) {
    const patch: Partial<StagingRow> = {
      ...editDraft,
      status: "modified",
    };
    await updateMutation.mutateAsync({ id: row.id, patch });
    setEditingId(null);
    setEditDraft({});
  }

  async function quickApprove(row: StagingRow) {
    await updateMutation.mutateAsync({ id: row.id, patch: { status: "approved" } });
  }

  async function quickReject(row: StagingRow) {
    await updateMutation.mutateAsync({ id: row.id, patch: { status: "rejected" } });
  }

  async function resetToPending(row: StagingRow) {
    await updateMutation.mutateAsync({ id: row.id, patch: { status: "pending" } });
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl pb-32" data-testid="page-staging-base-ingredients">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBasket className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Ingredient Review Queue</h1>
          <Badge variant="outline" className="ml-2">Import staging</Badge>
        </div>
        <p className="text-muted-foreground">
          New ingredients suggested from the recipe import. Review each one, approve what's right,
          edit what needs tweaking, reject what shouldn't be here, then promote the approved batch
          to the real base ingredients list.
        </p>
      </div>

      {/* Stats bar */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-600">{counts.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{counts.approved}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{counts.modified}</div>
              <div className="text-xs text-muted-foreground">Edited</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{counts.rejected}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{counts.promoted}</div>
              <div className="text-xs text-muted-foreground">Promoted</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="modified">Edited ({counts.modified})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="promoted">Promoted ({counts.promoted})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Row cards */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nothing here.</p>
            <p className="text-sm mt-1">
              {filter === "pending"
                ? "All ingredients have been reviewed. Great work!"
                : `No ingredients in "${filter}" status.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const isEditing = editingId === row.id;
            const isDone = row.status === "promoted";
            return (
              <Card key={row.id} data-testid={`staging-row-${row.id}`} className={isDone ? "opacity-60" : ""}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Left: name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isEditing ? (
                          <Input
                            value={(editDraft.name as string) ?? ""}
                            onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                            className="text-lg font-semibold h-9 max-w-md"
                            data-testid={`input-name-${row.id}`}
                          />
                        ) : (
                          <h3 className="text-lg font-semibold truncate" data-testid={`text-name-${row.id}`}>
                            {row.name}
                          </h3>
                        )}
                        <Badge className={`${statusBadgeClass(row.status)} border text-xs`}>
                          {row.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          used in {row.reference_count} recipe{row.reference_count !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      {/* Fields: category / unit / qty / price */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Category</Label>
                          {isEditing ? (
                            <Select
                              value={editDraft.suggested_category as string}
                              onValueChange={(v) =>
                                setEditDraft((d) => ({ ...d, suggested_category: v }))
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-sm font-medium capitalize">
                              {row.suggested_category.replace("_", " ")}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Purchase unit</Label>
                          {isEditing ? (
                            <Select
                              value={editDraft.suggested_purchase_unit as string}
                              onValueChange={(v) =>
                                setEditDraft((d) => ({ ...d, suggested_purchase_unit: v }))
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PURCHASE_UNITS.map((u) => (
                                  <SelectItem key={u.value} value={u.value}>
                                    {u.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-sm font-medium">{row.suggested_purchase_unit}</div>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Qty per purchase</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="h-9"
                              value={String(editDraft.suggested_purchase_quantity ?? "")}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  suggested_purchase_quantity: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            <div className="text-sm font-medium">{row.suggested_purchase_quantity}</div>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Est. price</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="h-9"
                              value={String(editDraft.suggested_price ?? "")}
                              onChange={(e) =>
                                setEditDraft((d) => ({ ...d, suggested_price: e.target.value }))
                              }
                            />
                          ) : (
                            <div className="text-sm font-medium">{formatMoney(row.suggested_price)}</div>
                          )}
                        </div>
                      </div>

                      {/* AI reasoning */}
                      {row.ai_reasoning && !isEditing && (
                        <div className="mt-3 flex gap-2 items-start">
                          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground italic">{row.ai_reasoning}</p>
                        </div>
                      )}

                      {/* Sample recipes */}
                      {row.sample_recipes && row.sample_recipes.length > 0 && !isEditing && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground mr-1">Used in:</span>
                          {row.sample_recipes.slice(0, 4).map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {r}
                            </Badge>
                          ))}
                          {row.reference_count > 4 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{row.reference_count - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Reviewer notes (only show when rejected) */}
                      {row.reviewer_notes && !isEditing && (
                        <div className="mt-2 text-xs text-muted-foreground italic">
                          Note: {row.reviewer_notes}
                        </div>
                      )}

                      {row.status === "promoted" && row.approved_as_id && (
                        <div className="mt-2 text-xs text-purple-700">
                          ✓ Live as base ingredient #{row.approved_as_id}
                        </div>
                      )}
                    </div>

                    {/* Right: action buttons */}
                    {!isDone && (
                      <div className="flex flex-row md:flex-col gap-2 md:min-w-[180px]">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              className="flex-1 md:flex-none"
                              onClick={() => saveEdit(row)}
                              disabled={updateMutation.isPending}
                              data-testid={`button-save-${row.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save &amp; approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 md:flex-none"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : row.status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              className="flex-1 md:flex-none bg-green-600 hover:bg-green-700"
                              onClick={() => quickApprove(row)}
                              disabled={updateMutation.isPending}
                              data-testid={`button-approve-${row.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 md:flex-none"
                              onClick={() => startEdit(row)}
                              data-testid={`button-edit-${row.id}`}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 md:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => quickReject(row)}
                              disabled={updateMutation.isPending}
                              data-testid={`button-reject-${row.id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 md:flex-none"
                              onClick={() => resetToPending(row)}
                              disabled={updateMutation.isPending}
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              Undo
                            </Button>
                            {row.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 md:flex-none"
                                onClick={() => startEdit(row)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky promote footer */}
      {readyToPromoteCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-40">
          <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-sm">
                <strong>{readyToPromoteCount}</strong> ingredient{readyToPromoteCount !== 1 ? "s" : ""} ready to
                add to the live base ingredients list
              </span>
            </div>
            <Button
              size="lg"
              onClick={() => setConfirmingPromote(true)}
              disabled={promoteMutation.isPending}
              data-testid="button-promote"
            >
              Promote {readyToPromoteCount} to live
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Promote confirmation dialog */}
      <AlertDialog open={confirmingPromote} onOpenChange={setConfirmingPromote}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote {readyToPromoteCount} ingredients?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {readyToPromoteCount} new rows in your real base ingredients list
              with the prices and categories shown. You can still edit them afterward on the Base
              Ingredients page. This action cannot be automatically undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => promoteMutation.mutate()}
              disabled={promoteMutation.isPending}
            >
              {promoteMutation.isPending ? "Promoting…" : "Yes, promote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
