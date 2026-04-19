// Admin catalog editor — lets Mike edit appetizer/dessert/equipment item
// prices and the pricing_config (beverage rates, service fees, tax) without
// touching code. Everything lives in the DB; the /inquire form reads the same
// tables. Mounted at /catalog. Admin-only — non-admins are redirected.
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsAdmin } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Plus, Loader2, AlertTriangle } from "lucide-react";

// Unit options the admin can pick. Free-text was error-prone (typos like
// "per_peice" slipped through). Options cover appetizer, dessert, and equipment
// items. For a new category not covered here, add an option and redeploy.
const UNIT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "per_piece", label: "per piece" },
  { value: "per_person", label: "per person" },
  { value: "each", label: "each" },
  { value: "flavor", label: "flavor (spread pack)" },
  { value: "per_event", label: "per event (flat)" },
  { value: "per_lb", label: "per pound" },
  { value: "included", label: "included (no charge)" },
];

function LoadingCard({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Loader2 className="h-4 w-4 animate-spin" /> Loading {label}…</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

function ErrorCard({ label, message }: { label: string; message: string }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base text-red-700"><AlertTriangle className="h-4 w-4" /> Couldn't load {label}</CardTitle></CardHeader>
      <CardContent className="text-sm text-red-700">{message}</CardContent>
    </Card>
  );
}

const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const fmtPct = (bps: number) => `${(bps / 100).toFixed(2)}%`;

interface AppetizerCategoryRow {
  id: number;
  categoryKey: string;
  label: string;
  perPerson: boolean;
  servingPack: { pricePerServingCents: number; flavorsToPick: number; description: string } | null;
  displayOrder: number;
  isActive: boolean;
}
interface AppetizerItemRow {
  id: number;
  categoryId: number;
  name: string;
  priceCents: number;
  unit: string;
  displayOrder: number;
  isActive: boolean;
}
interface DessertItemRow {
  id: number;
  name: string;
  priceCents: number;
  unit: string;
  displayOrder: number;
  isActive: boolean;
}
interface EquipmentCategoryRow {
  id: number;
  categoryKey: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}
interface EquipmentItemRow {
  id: number;
  categoryId: number;
  name: string;
  priceCents: number;
  unit: string;
  displayOrder: number;
  isActive: boolean;
}
interface PricingConfigRow {
  id: number;
  wetHireRateCentsPerHour: number;
  dryHireRateCentsPerHour: number;
  liquorMultiplierWell: number;
  liquorMultiplierMidShelf: number;
  liquorMultiplierTopShelf: number;
  nonAlcoholicPackageCents: number;
  coffeeTeaServiceCents: number;
  tableWaterServiceCents: number;
  glasswareCents: number;
  serviceFeeDropOffBps: number;
  serviceFeeStandardBps: number;
  serviceFeeFullServiceNoSetupBps: number;
  serviceFeeFullServiceBps: number;
  taxRateBps: number;
  childDiscountBps: number;
}

// ---------------------------------------------------------------------------
// Appetizers tab
// ---------------------------------------------------------------------------

function AppetizersEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const catsQ = useQuery<AppetizerCategoryRow[]>({ queryKey: ["/api/catalog/admin/appetizer-categories"] });
  const itemsQ = useQuery<AppetizerItemRow[]>({ queryKey: ["/api/catalog/admin/appetizer-items"] });
  const categories = catsQ.data ?? [];
  const items = itemsQ.data ?? [];
  const [editingItem, setEditingItem] = useState<AppetizerItemRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<AppetizerItemRow | null>(null);
  const editingCategoryLabel = editingItem
    ? categories.find((c) => c.id === editingItem.categoryId)?.label
    : undefined;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/catalog/admin/appetizer-items"] });
    qc.invalidateQueries({ queryKey: ["/api/catalog/appetizers"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (item: AppetizerItemRow) => {
      const method = item.id ? "PATCH" : "POST";
      const url = item.id
        ? `/api/catalog/admin/appetizer-items/${item.id}`
        : `/api/catalog/admin/appetizer-items`;
      await apiRequest(method, url, item);
    },
    onSuccess: () => {
      invalidate();
      setEditingItem(null);
      toast({ title: "Saved" });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/catalog/admin/appetizer-items/${id}`);
    },
    onSuccess: () => {
      invalidate();
      setDeletingItem(null);
      toast({ title: "Deleted" });
    },
  });

  if (catsQ.isLoading || itemsQ.isLoading) return <LoadingCard label="appetizers" />;
  if (catsQ.error || itemsQ.error)
    return <ErrorCard label="appetizers" message={String((catsQ.error || itemsQ.error) as any)} />;

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        const nextOrder = catItems.length
          ? Math.max(...catItems.map((i) => i.displayOrder || 0)) + 1
          : 1;
        return (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{cat.label}</CardTitle>
                <CardDescription>
                  {cat.perPerson && "Per-person pricing · "}
                  {cat.servingPack && `Serving pack: ${fmtMoney(cat.servingPack.pricePerServingCents)}/serving, ${cat.servingPack.flavorsToPick} flavors · `}
                  {catItems.length} items
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditingItem({
                    id: 0,
                    categoryId: cat.id,
                    name: "",
                    priceCents: 0,
                    unit: cat.perPerson ? "per_person" : cat.servingPack ? "flavor" : "per_piece",
                    displayOrder: nextOrder,
                    isActive: true,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catItems.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell>{fmtMoney(it.priceCents)}</TableCell>
                      <TableCell>{it.unit}</TableCell>
                      <TableCell>{it.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setEditingItem(it)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeletingItem(it)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <ItemEditDialog
        open={!!editingItem}
        item={editingItem}
        categoryLabel={editingCategoryLabel}
        onClose={() => setEditingItem(null)}
        onSave={(item) => saveMutation.mutate(item as AppetizerItemRow)}
        saving={saveMutation.isPending}
      />
      <DeleteConfirmDialog
        open={!!deletingItem}
        label={deletingItem?.name || ""}
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desserts tab
// ---------------------------------------------------------------------------

function DessertsEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const itemsQ = useQuery<DessertItemRow[]>({ queryKey: ["/api/catalog/admin/dessert-items"] });
  const items = itemsQ.data ?? [];
  const [editing, setEditing] = useState<DessertItemRow | null>(null);
  const [deleting, setDeleting] = useState<DessertItemRow | null>(null);
  const nextOrder = items.length
    ? Math.max(...items.map((i) => i.displayOrder || 0)) + 1
    : 1;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/catalog/admin/dessert-items"] });
    qc.invalidateQueries({ queryKey: ["/api/catalog/desserts"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (item: DessertItemRow) => {
      const method = item.id ? "PATCH" : "POST";
      const url = item.id
        ? `/api/catalog/admin/dessert-items/${item.id}`
        : `/api/catalog/admin/dessert-items`;
      await apiRequest(method, url, item);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast({ title: "Saved" });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/catalog/admin/dessert-items/${id}`);
    },
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast({ title: "Deleted" });
    },
  });

  if (itemsQ.isLoading) return <LoadingCard label="desserts" />;
  if (itemsQ.error) return <ErrorCard label="desserts" message={String(itemsQ.error as any)} />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Desserts</CardTitle>
          <CardDescription>Per-piece pricing · {items.length} items</CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setEditing({
              id: 0,
              name: "",
              priceCents: 0,
              unit: "per_piece",
              displayOrder: nextOrder,
              isActive: true,
            })
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Add dessert
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell>{fmtMoney(it.priceCents)}</TableCell>
                <TableCell>{it.isActive ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(it)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleting(it)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <ItemEditDialog
        open={!!editing}
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(item) => saveMutation.mutate(item as DessertItemRow)}
        saving={saveMutation.isPending}
      />
      <DeleteConfirmDialog
        open={!!deleting}
        label={deleting?.name || ""}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Equipment tab
// ---------------------------------------------------------------------------

function EquipmentEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const catsQ = useQuery<EquipmentCategoryRow[]>({ queryKey: ["/api/catalog/admin/equipment-categories"] });
  const itemsQ = useQuery<EquipmentItemRow[]>({ queryKey: ["/api/catalog/admin/equipment-items"] });
  const categories = catsQ.data ?? [];
  const items = itemsQ.data ?? [];
  const [editing, setEditing] = useState<EquipmentItemRow | null>(null);
  const [deleting, setDeleting] = useState<EquipmentItemRow | null>(null);
  const editingCategoryLabel = editing
    ? categories.find((c) => c.id === editing.categoryId)?.label
    : undefined;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/catalog/admin/equipment-items"] });
    qc.invalidateQueries({ queryKey: ["/api/catalog/equipment"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (item: EquipmentItemRow) => {
      const method = item.id ? "PATCH" : "POST";
      const url = item.id
        ? `/api/catalog/admin/equipment-items/${item.id}`
        : `/api/catalog/admin/equipment-items`;
      await apiRequest(method, url, item);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast({ title: "Saved" });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/catalog/admin/equipment-items/${id}`);
    },
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast({ title: "Deleted" });
    },
  });

  if (catsQ.isLoading || itemsQ.isLoading) return <LoadingCard label="equipment" />;
  if (catsQ.error || itemsQ.error)
    return <ErrorCard label="equipment" message={String((catsQ.error || itemsQ.error) as any)} />;

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        const nextOrder = catItems.length
          ? Math.max(...catItems.map((i) => i.displayOrder || 0)) + 1
          : 1;
        return (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{cat.label}</CardTitle>
                <CardDescription>{catItems.length} items</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditing({
                    id: 0,
                    categoryId: cat.id,
                    name: "",
                    priceCents: 0,
                    unit: "each",
                    displayOrder: nextOrder,
                    isActive: true,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catItems.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell>{fmtMoney(it.priceCents)}</TableCell>
                      <TableCell>{it.unit}</TableCell>
                      <TableCell>{it.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(it)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleting(it)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
      <ItemEditDialog
        open={!!editing}
        item={editing}
        categoryLabel={editingCategoryLabel}
        onClose={() => setEditing(null)}
        onSave={(item) => saveMutation.mutate(item as EquipmentItemRow)}
        saving={saveMutation.isPending}
      />
      <DeleteConfirmDialog
        open={!!deleting}
        label={deleting?.name || ""}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing Rates tab (single row — beverage rates, service fees, tax)
// ---------------------------------------------------------------------------

function PricingConfigEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const configQ = useQuery<PricingConfigRow>({
    queryKey: ["/api/catalog/pricing-config"],
  });
  const config = configQ.data;
  const [draft, setDraft] = useState<PricingConfigRow | null>(null);

  const editing = draft ?? config ?? null;
  const dirty = !!draft;

  const saveMutation = useMutation({
    mutationFn: async (next: Partial<PricingConfigRow>) => {
      await apiRequest("PATCH", "/api/catalog/pricing-config", next);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/catalog/pricing-config"] });
      setDraft(null);
      toast({ title: "Saved" });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  // The GET endpoint returns 404 when the single config row doesn't exist yet
  // (e.g. a new environment that hasn't been seeded). Offer a one-click create.
  const errorMessage = configQ.error ? String(configQ.error) : null;
  const notSeeded = errorMessage?.includes("404") || errorMessage?.includes("not seeded");
  if (configQ.isLoading) return <LoadingCard label="pricing config" />;
  if (notSeeded) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-700">Pricing config not set up</CardTitle>
          <CardDescription>
            This environment doesn't have a pricing-config row yet. Click below to create
            one with the default rates (tax 10.25%, wet-bar $15/pp/hr, etc.) — you can edit any value afterward.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() =>
              saveMutation.mutate({
                wetHireRateCentsPerHour: 1500,
                dryHireRateCentsPerHour: 800,
                liquorMultiplierWell: 100,
                liquorMultiplierMidShelf: 125,
                liquorMultiplierTopShelf: 150,
                nonAlcoholicPackageCents: 500,
                coffeeTeaServiceCents: 400,
                tableWaterServiceCents: 650,
                glasswareCents: 200,
                serviceFeeDropOffBps: 0,
                serviceFeeStandardBps: 1500,
                serviceFeeFullServiceNoSetupBps: 1750,
                serviceFeeFullServiceBps: 2000,
                taxRateBps: 1025,
                childDiscountBps: 5000,
              })
            }
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Creating…" : "Create default pricing config"}
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (errorMessage) return <ErrorCard label="pricing config" message={errorMessage} />;
  if (!editing) return <LoadingCard label="pricing config" />;

  const update = (patch: Partial<PricingConfigRow>) =>
    setDraft((prev) => ({ ...(prev ?? editing), ...patch }));

  // Helpers: dollar input <-> cents, percent input <-> bps, multiplier input <-> x100
  const DollarInput = ({
    label,
    valueCents,
    suffix,
    onChange,
  }: { label: string; valueCents: number; suffix?: string; onChange: (v: number) => void }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">$</span>
        <Input
          type="number"
          step="0.01"
          value={(valueCents / 100).toFixed(2)}
          onChange={(e) => onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
        />
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
  const PercentInput = ({
    label,
    valueBps,
    onChange,
  }: { label: string; valueBps: number; onChange: (v: number) => void }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          value={(valueBps / 100).toFixed(2)}
          onChange={(e) => onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
        />
        <span className="text-gray-500">%</span>
      </div>
    </div>
  );
  const MultiplierInput = ({
    label,
    valueX100,
    onChange,
  }: { label: string; valueX100: number; onChange: (v: number) => void }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          value={(valueX100 / 100).toFixed(2)}
          onChange={(e) => onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
        />
        <span className="text-gray-500">×</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bartending rates</CardTitle>
          <CardDescription>Charged per drinking guest × bar duration hours × quality multiplier.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DollarInput
            label="Wet-hire rate (liquor + bartender)"
            valueCents={editing.wetHireRateCentsPerHour}
            suffix="/pp/hr"
            onChange={(v) => update({ wetHireRateCentsPerHour: v })}
          />
          <DollarInput
            label="Dry-hire rate (bartender only)"
            valueCents={editing.dryHireRateCentsPerHour}
            suffix="/pp/hr"
            onChange={(v) => update({ dryHireRateCentsPerHour: v })}
          />
          <MultiplierInput
            label="Well liquor multiplier"
            valueX100={editing.liquorMultiplierWell}
            onChange={(v) => update({ liquorMultiplierWell: v })}
          />
          <MultiplierInput
            label="Mid-shelf multiplier"
            valueX100={editing.liquorMultiplierMidShelf}
            onChange={(v) => update({ liquorMultiplierMidShelf: v })}
          />
          <MultiplierInput
            label="Top-shelf multiplier"
            valueX100={editing.liquorMultiplierTopShelf}
            onChange={(v) => update({ liquorMultiplierTopShelf: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-person add-ons</CardTitle>
          <CardDescription>Flat rate × guest count.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DollarInput
            label="Non-alcoholic package"
            valueCents={editing.nonAlcoholicPackageCents}
            suffix="/pp"
            onChange={(v) => update({ nonAlcoholicPackageCents: v })}
          />
          <DollarInput
            label="Coffee & tea service"
            valueCents={editing.coffeeTeaServiceCents}
            suffix="/pp"
            onChange={(v) => update({ coffeeTeaServiceCents: v })}
          />
          <DollarInput
            label="Table water service"
            valueCents={editing.tableWaterServiceCents}
            suffix="/pp"
            onChange={(v) => update({ tableWaterServiceCents: v })}
          />
          {/* Glassware moved to Equipment catalog — customers now pick specific
              glasses (beer, wine, cocktail, water goblets, champagne flutes).
              Edit those under Equipment → Glassware. */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service fees</CardTitle>
          <CardDescription>Applied to the pre-tax subtotal based on service style.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PercentInput
            label="Drop-off"
            valueBps={editing.serviceFeeDropOffBps}
            onChange={(v) => update({ serviceFeeDropOffBps: v })}
          />
          <PercentInput
            label="Standard buffet"
            valueBps={editing.serviceFeeStandardBps}
            onChange={(v) => update({ serviceFeeStandardBps: v })}
          />
          <PercentInput
            label="Full-service, no setup"
            valueBps={editing.serviceFeeFullServiceNoSetupBps}
            onChange={(v) => update({ serviceFeeFullServiceNoSetupBps: v })}
          />
          <PercentInput
            label="Full-service"
            valueBps={editing.serviceFeeFullServiceBps}
            onChange={(v) => update({ serviceFeeFullServiceBps: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax</CardTitle>
          <CardDescription>Applied after subtotal + service fee – discount.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PercentInput
            label="Sales & use tax"
            valueBps={editing.taxRateBps}
            onChange={(v) => update({ taxRateBps: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kids pricing</CardTitle>
          <CardDescription>Discount applied to the per-person food tier for children under 10. Other categories (appetizers, equipment, water service) still use total guest count.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PercentInput
            label="Child discount (under 10)"
            valueBps={editing.childDiscountBps}
            onChange={(v) => update({ childDiscountBps: v })}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          disabled={!dirty || saveMutation.isPending}
          onClick={() => draft && saveMutation.mutate(draft)}
        >
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="outline" disabled={!dirty} onClick={() => setDraft(null)}>
          Reset
        </Button>
        {dirty && <span className="text-sm text-amber-600">Unsaved changes</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared dialogs
// ---------------------------------------------------------------------------

interface GenericItem {
  id: number;
  name: string;
  priceCents: number;
  unit: string;
  displayOrder: number;
  isActive: boolean;
  categoryId?: number;
}

function ItemEditDialog({
  open,
  item,
  categoryLabel,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  item: GenericItem | null;
  categoryLabel?: string;
  onClose: () => void;
  onSave: (item: GenericItem) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<GenericItem | null>(null);
  // Sync local state when item changes
  if (item && (!draft || draft.id !== item.id)) {
    setDraft(item);
  }
  if (!open || !draft) return null;

  const update = (patch: Partial<GenericItem>) => setDraft({ ...draft, ...patch });
  const priceDollarsStr = (draft.priceCents / 100).toFixed(2);
  const priceInvalid = draft.priceCents < 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>
            {categoryLabel ? <>In <strong>{categoryLabel}</strong> · </> : null}
            Changes take effect within 1 minute (cache TTL).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price (dollars)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceDollarsStr}
                aria-invalid={priceInvalid}
                className={priceInvalid ? "border-red-500" : undefined}
                onChange={(e) => {
                  const n = parseFloat(e.target.value || "0");
                  if (!Number.isFinite(n) || n < 0) {
                    update({ priceCents: 0 });
                    return;
                  }
                  update({ priceCents: Math.round(n * 100) });
                }}
              />
              {priceInvalid && <p className="text-xs text-red-600">Price cannot be negative.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={draft.unit} onValueChange={(v) => update({ unit: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Display order</Label>
              <Input
                type="number"
                min="0"
                value={draft.displayOrder}
                onChange={(e) => update({ displayOrder: Math.max(0, parseInt(e.target.value || "0")) })}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={draft.isActive}
                onCheckedChange={(v) => update({ isActive: v })}
              />
              <Label>Active (shown on inquiry form)</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !draft.name || priceInvalid} onClick={() => onSave(draft)}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open,
  label,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{label}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the item from the inquiry form. Past inquiries keep their stored copy — nothing retroactive.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Catalog() {
  const isAdmin = useIsAdmin();
  const [, setLocation] = useLocation();

  // Redirect non-admins to dashboard. Admins-only because these edits affect
  // every quote that gets generated — not a mistake we want chefs or staff
  // to make by accident.
  useEffect(() => {
    if (isAdmin === false) setLocation("/");
  }, [isAdmin, setLocation]);

  if (!isAdmin) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-sm text-gray-500">Admin access required — redirecting…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catalog & Pricing</h1>
        <p className="text-sm text-gray-600">
          Prices for appetizers, desserts, equipment, and the beverage/service-fee/tax rates used
          by the inquiry form and quote generator. Changes propagate within 1 minute.
        </p>
      </div>
      <Tabs defaultValue="appetizers">
        <TabsList>
          <TabsTrigger value="appetizers">Appetizers</TabsTrigger>
          <TabsTrigger value="desserts">Desserts</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Rates</TabsTrigger>
        </TabsList>
        <TabsContent value="appetizers" className="mt-4"><AppetizersEditor /></TabsContent>
        <TabsContent value="desserts" className="mt-4"><DessertsEditor /></TabsContent>
        <TabsContent value="equipment" className="mt-4"><EquipmentEditor /></TabsContent>
        <TabsContent value="pricing" className="mt-4"><PricingConfigEditor /></TabsContent>
      </Tabs>
    </div>
  );
}
