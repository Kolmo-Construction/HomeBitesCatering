import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Check,
  X,
  Pencil,
  Undo2,
  ArrowRight,
  ChefHat,
  Sparkles,
  ShoppingBasket,
  PartyPopper,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  { value: "spices", label: "Spices & Seasonings" },
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
  const n = typeof v === "number" ? v : parseFloat(String(v || "0"));
  if (Number.isNaN(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export default function StagingBaseIngredientsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"todo" | StagingStatus>("todo");
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
      toast({ title: "Couldn't save", description: err?.message || "Try again?", variant: "destructive" });
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
        title: "Added to your pantry",
        description: `${data.promoted} new ingredients are now live${data.failed ? ` (${data.failed} hit an error)` : ""}.`,
      });
      setConfirmingPromote(false);
    },
    onError: (err: any) => {
      toast({ title: "Couldn't add them", description: err?.message || "Try again?", variant: "destructive" });
    },
  });

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, approved: 0, modified: 0, rejected: 0, promoted: 0 };
    for (const r of rows) {
      c[r.status] = (c[r.status] || 0) + 1;
    }
    return c;
  }, [rows]);

  // "todo" = pending only — the thing Mike needs to act on
  const todoRows = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const readyRows = useMemo(
    () => rows.filter((r) => r.status === "approved" || r.status === "modified"),
    [rows],
  );

  const filtered = useMemo(() => {
    if (filter === "todo") return todoRows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter, todoRows]);

  const reviewedCount = rows.length - counts.pending;
  const totalCount = rows.length;
  const pctReviewed = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;
  const readyToPromoteCount = readyRows.length;
  const allDone = totalCount > 0 && counts.pending === 0 && readyToPromoteCount === 0;

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
    const patch: Partial<StagingRow> = { ...editDraft, status: "modified" };
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
    <div className="container mx-auto py-6 px-4 max-w-5xl pb-32" data-testid="page-staging-base-ingredients">
      {/* ============================================================ */}
      {/* HERO — the "why" and the "what to do" */}
      {/* ============================================================ */}
      <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <ShoppingBasket className="h-6 w-6 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">New ingredients from your recipe import</h1>
            <p className="text-muted-foreground mb-4">
              We're bringing <strong>204 of your recipes from Recipe Generator</strong> into HomeBites.
              Before we can import them, we need to know which ingredients you actually stock. Go through
              the list below and tell us which ones to add to your pantry. It takes about 5 minutes.
            </p>

            {totalCount > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>
                    <strong>{reviewedCount}</strong> of {totalCount} reviewed
                  </span>
                  <span className="text-muted-foreground">{Math.round(pctReviewed)}%</span>
                </div>
                <Progress value={pctReviewed} className="h-2" />
              </div>
            )}
          </div>
        </div>

        {/* Three-step path */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/60 dark:bg-black/20">
            <div className="h-6 w-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
            <div>
              <div className="font-semibold">You're here</div>
              <div className="text-muted-foreground text-xs">Review {totalCount} suggested ingredients</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/60 dark:bg-black/20">
            <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">2</div>
            <div>
              <div className="font-semibold">Add to pantry</div>
              <div className="text-muted-foreground text-xs">One click to add all approved ones</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/60 dark:bg-black/20">
            <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">3</div>
            <div>
              <div className="font-semibold">Import recipes</div>
              <div className="text-muted-foreground text-xs">All 204 recipes come into HomeBites</div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ALL DONE STATE */}
      {/* ============================================================ */}
      {allDone && (
        <Card className="mb-6 border-green-300 bg-green-50 dark:bg-green-950/20">
          <CardContent className="py-6 text-center">
            <PartyPopper className="h-10 w-10 mx-auto mb-2 text-green-600" />
            <h2 className="text-xl font-bold text-green-900 dark:text-green-100">All done!</h2>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              You've reviewed every ingredient. {counts.promoted} new ingredients have been added to your
              pantry. The recipe import will be ready next — we'll ping you when it's set up.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* FILTER TABS */}
      {/* ============================================================ */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="todo">To review ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Adding ({counts.approved + counts.modified})</TabsTrigger>
          <TabsTrigger value="rejected">Skipped ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="promoted">Added to pantry ({counts.promoted})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ============================================================ */}
      {/* ROW CARDS */}
      {/* ============================================================ */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-40" />
            {filter === "todo" ? (
              <>
                <p className="font-medium">Nothing left to review 🎉</p>
                <p className="text-sm mt-1">
                  {readyToPromoteCount > 0
                    ? "You've gone through everything. Hit the big button at the bottom to add them to your pantry."
                    : "Everything has been handled. You can check the other tabs to see what you did."}
                </p>
              </>
            ) : (
              <p className="text-sm">
                Nothing in this tab yet.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const isEditing = editingId === row.id;
            return (
              <Card
                key={row.id}
                data-testid={`staging-row-${row.id}`}
                className={
                  row.status === "approved" || row.status === "modified"
                    ? "border-green-300"
                    : row.status === "rejected"
                    ? "opacity-50"
                    : row.status === "promoted"
                    ? "opacity-60"
                    : ""
                }
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Left: ingredient info */}
                    <div className="flex-1 min-w-0">
                      {/* Name + context */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <Input
                              value={(editDraft.name as string) ?? ""}
                              onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                              className="text-lg font-semibold h-10"
                              data-testid={`input-name-${row.id}`}
                            />
                          ) : (
                            <h3 className="text-lg font-semibold" data-testid={`text-name-${row.id}`}>
                              {row.name}
                            </h3>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Used in <strong>{row.reference_count}</strong> recipe
                            {row.reference_count !== 1 ? "s" : ""}
                            {row.sample_recipes?.length > 0 && (
                              <>
                                {" — "}
                                {row.sample_recipes.slice(0, 3).join(", ")}
                                {row.reference_count > 3 && ` +${row.reference_count - 3} more`}
                              </>
                            )}
                          </p>
                        </div>

                        {/* Status pill (only for non-pending) */}
                        {row.status !== "pending" && (
                          <Badge
                            className={
                              row.status === "approved" || row.status === "modified"
                                ? "bg-green-100 text-green-800 border-green-300 border"
                                : row.status === "rejected"
                                ? "bg-gray-100 text-gray-600 border-gray-300 border"
                                : "bg-purple-100 text-purple-800 border-purple-300 border"
                            }
                          >
                            {row.status === "approved" || row.status === "modified"
                              ? "Adding ✓"
                              : row.status === "rejected"
                              ? "Skipped"
                              : "In pantry ✓"}
                          </Badge>
                        )}
                      </div>

                      {/* AI guess bubble (read mode) */}
                      {!isEditing && (
                        <div className="rounded-lg bg-muted/50 p-3 text-sm">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                            <Sparkles className="h-3 w-3" />
                            Our guess (edit if wrong)
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1">
                            <div>
                              <span className="text-muted-foreground text-xs">Category: </span>
                              <span className="font-medium">{categoryLabel(row.suggested_category)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Price: </span>
                              <span className="font-medium">
                                {formatMoney(row.suggested_price)} / {row.suggested_purchase_unit}
                              </span>
                            </div>
                          </div>
                          {row.ai_reasoning && (
                            <div className="text-xs text-muted-foreground italic mt-2 pt-2 border-t border-border/50">
                              {row.ai_reasoning}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Edit mode fields */}
                      {isEditing && (
                        <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Category</Label>
                              <Select
                                value={editDraft.suggested_category as string}
                                onValueChange={(v) =>
                                  setEditDraft((d) => ({ ...d, suggested_category: v }))
                                }
                              >
                                <SelectTrigger className="h-9 mt-0.5">
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
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Bought by the</Label>
                              <Select
                                value={editDraft.suggested_purchase_unit as string}
                                onValueChange={(v) =>
                                  setEditDraft((d) => ({ ...d, suggested_purchase_unit: v }))
                                }
                              >
                                <SelectTrigger className="h-9 mt-0.5">
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
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Price per {editDraft.suggested_purchase_unit || "unit"}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-9 mt-0.5"
                                value={String(editDraft.suggested_price ?? "")}
                                onChange={(e) =>
                                  setEditDraft((d) => ({ ...d, suggested_price: e.target.value }))
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Quantity</Label>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-9 mt-0.5"
                                value={String(editDraft.suggested_purchase_quantity ?? "")}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    suggested_purchase_quantity: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex flex-row md:flex-col gap-2 md:min-w-[180px] md:w-[180px] shrink-0">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700"
                            onClick={() => saveEdit(row)}
                            disabled={updateMutation.isPending}
                            data-testid={`button-save-${row.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
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
                            Yes, I buy this
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 md:flex-none"
                            onClick={() => startEdit(row)}
                            data-testid={`button-edit-${row.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit first
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 md:flex-none text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            onClick={() => quickReject(row)}
                            disabled={updateMutation.isPending}
                            data-testid={`button-reject-${row.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Skip it
                          </Button>
                        </>
                      ) : row.status === "promoted" ? (
                        <div className="text-xs text-purple-700 text-center self-center">
                          Live as ingredient #{row.approved_as_id}
                        </div>
                      ) : (
                        <>
                          {(row.status === "approved" || row.status === "modified") && (
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
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* STICKY FOOTER — promote to pantry */}
      {/* ============================================================ */}
      {readyToPromoteCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-40">
          <div className="container mx-auto max-w-5xl flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">
                {readyToPromoteCount} ingredient{readyToPromoteCount !== 1 ? "s" : ""} ready to go
              </div>
              <div className="text-xs text-muted-foreground">
                Click to add them to your real pantry so recipes can use them.
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => setConfirmingPromote(true)}
              disabled={promoteMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-promote"
            >
              Add {readyToPromoteCount} to pantry
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIRM PROMOTE DIALOG */}
      {/* ============================================================ */}
      <AlertDialog open={confirmingPromote} onOpenChange={setConfirmingPromote}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add {readyToPromoteCount} ingredients to your pantry?</AlertDialogTitle>
            <AlertDialogDescription>
              These will show up in your Base Ingredients list right away with the prices and categories
              you picked. You can always edit them later — prices, categories, anything. This doesn't
              import the recipes yet — that's step 3.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => promoteMutation.mutate()}
              disabled={promoteMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {promoteMutation.isPending ? "Adding…" : "Yes, add them"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
