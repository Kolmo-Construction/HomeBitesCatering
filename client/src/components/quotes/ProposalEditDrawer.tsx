// ProposalEditDrawer — the admin's customization surface for a proposal.
// Opens as a side sheet from AdminQuotePreview. Every field here maps
// directly onto the Proposal blob stored on quotes.proposal, which is
// what the customer-facing page renders. Save → PATCH /api/quotes/:id/proposal.

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type {
  Proposal,
  ProposalMenuItem,
  ProposalAppetizer,
  ProposalDessert,
  ProposalLineItem,
} from "@shared/proposal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProposal: Proposal;
  onSave: (next: Proposal) => void;
  isSaving?: boolean;
}

// ─── Cents ↔ dollar helpers ───────────────────────────────────────────────────
function centsToDollars(cents: number | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}
function dollarsToCents(s: string): number {
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

const MENU_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "appetizer", label: "To Start / Appetizer" },
  { value: "cocktail", label: "Cocktail Hour" },
  { value: "main", label: "The Main" },
  { value: "side", label: "On The Side" },
  { value: "dessert", label: "Sweet Endings" },
  { value: "beverage", label: "To Drink" },
];

export default function ProposalEditDrawer({
  open,
  onOpenChange,
  initialProposal,
  onSave,
  isSaving = false,
}: Props) {
  const [draft, setDraft] = useState<Proposal>(initialProposal);

  // Reset local state whenever the drawer opens with a new proposal.
  useEffect(() => {
    if (open) setDraft(initialProposal);
  }, [open, initialProposal]);

  // Auto-compute totals from line items + service fee + tax on every edit so
  // the admin can just tweak prices and see the total update live.
  const computed = useMemo(() => {
    const lineSubtotal = draft.lineItems.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0,
    );
    const serviceFee = draft.pricing.serviceFeeCents ?? 0;
    const subtotal = lineSubtotal + serviceFee;
    const tax = draft.pricing.taxCents;
    const total = subtotal + tax;
    return { subtotal, total };
  }, [draft.lineItems, draft.pricing.serviceFeeCents, draft.pricing.taxCents]);

  const update = <K extends keyof Proposal>(key: K, value: Proposal[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const updatePricing = <K extends keyof Proposal["pricing"]>(
    key: K,
    value: Proposal["pricing"][K],
  ) => {
    setDraft((d) => ({ ...d, pricing: { ...d.pricing, [key]: value } }));
  };

  const updateVenue = <K extends keyof NonNullable<Proposal["venue"]>>(
    key: K,
    value: NonNullable<Proposal["venue"]>[K],
  ) => {
    setDraft((d) => ({
      ...d,
      venue: { ...(d.venue ?? {}), [key]: value },
    }));
  };

  // ─── Menu selections CRUD ─────────────────────────────────────────────────
  const addMenuItem = () => {
    const next: ProposalMenuItem = { name: "", category: "main" };
    update("menuSelections", [...(draft.menuSelections ?? []), next]);
  };
  const updateMenuItem = (i: number, patch: Partial<ProposalMenuItem>) => {
    const next = [...draft.menuSelections];
    next[i] = { ...next[i], ...patch };
    update("menuSelections", next);
  };
  const removeMenuItem = (i: number) => {
    update(
      "menuSelections",
      draft.menuSelections.filter((_, idx) => idx !== i),
    );
  };

  // ─── Appetizers CRUD ──────────────────────────────────────────────────────
  const addAppetizer = () => {
    const next: ProposalAppetizer = { itemName: "", quantity: 0 };
    update("appetizers", [...(draft.appetizers ?? []), next]);
  };
  const updateAppetizer = (i: number, patch: Partial<ProposalAppetizer>) => {
    const next = [...draft.appetizers];
    next[i] = { ...next[i], ...patch };
    update("appetizers", next);
  };
  const removeAppetizer = (i: number) => {
    update(
      "appetizers",
      draft.appetizers.filter((_, idx) => idx !== i),
    );
  };

  // ─── Desserts CRUD ────────────────────────────────────────────────────────
  const addDessert = () => {
    const next: ProposalDessert = { itemName: "", quantity: 0 };
    update("desserts", [...(draft.desserts ?? []), next]);
  };
  const updateDessert = (i: number, patch: Partial<ProposalDessert>) => {
    const next = [...draft.desserts];
    next[i] = { ...next[i], ...patch };
    update("desserts", next);
  };
  const removeDessert = (i: number) => {
    update(
      "desserts",
      draft.desserts.filter((_, idx) => idx !== i),
    );
  };

  // ─── Line items CRUD ──────────────────────────────────────────────────────
  const addLineItem = () => {
    const next: ProposalLineItem = {
      id: `li_${Date.now()}`,
      name: "",
      quantity: 1,
      price: 0,
    };
    update("lineItems", [...(draft.lineItems ?? []), next]);
  };
  const updateLineItem = (i: number, patch: Partial<ProposalLineItem>) => {
    const next = [...draft.lineItems];
    next[i] = { ...next[i], ...patch };
    update("lineItems", next);
  };
  const removeLineItem = (i: number) => {
    update(
      "lineItems",
      draft.lineItems.filter((_, idx) => idx !== i),
    );
  };

  // ─── Save ────────────────────────────────────────────────────────────────
  const handleSave = () => {
    // Mirror computed totals onto the blob we ship. The server's PATCH handler
    // also mirrors these onto the quote row (subtotal/tax/total).
    const next: Proposal = {
      ...draft,
      pricing: {
        ...draft.pricing,
        subtotalCents: computed.subtotal,
        totalCents: computed.total,
      },
    };
    onSave(next);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize proposal</SheetTitle>
          <SheetDescription>
            Everything here shows up exactly as-is on the customer&rsquo;s quote
            page. Changes save as a new version of the proposal blob.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="basics" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* ═══════════════ BASICS ═══════════════ */}
          <TabsContent value="basics" className="space-y-5 mt-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={draft.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={draft.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="partnerFirstName">Partner first name</Label>
                <Input
                  id="partnerFirstName"
                  value={draft.partnerFirstName ?? ""}
                  onChange={(e) =>
                    update(
                      "partnerFirstName",
                      e.target.value || undefined,
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="partnerLastName">Partner last name</Label>
                <Input
                  id="partnerLastName"
                  value={draft.partnerLastName ?? ""}
                  onChange={(e) =>
                    update(
                      "partnerLastName",
                      e.target.value || undefined,
                    )
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="eventDate">Event date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={
                    draft.eventDate
                      ? new Date(draft.eventDate).toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    update(
                      "eventDate",
                      e.target.value ? new Date(e.target.value).toISOString() : null,
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="guestCount">Guests</Label>
                <Input
                  id="guestCount"
                  type="number"
                  min={0}
                  value={draft.guestCount}
                  onChange={(e) =>
                    update("guestCount", parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="venueName">Venue</Label>
              <Input
                id="venueName"
                value={draft.venue?.name ?? ""}
                onChange={(e) => updateVenue("name", e.target.value || undefined)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="venueStreet">Street</Label>
                <Input
                  id="venueStreet"
                  value={draft.venue?.street ?? ""}
                  onChange={(e) => updateVenue("street", e.target.value || undefined)}
                />
              </div>
              <div>
                <Label htmlFor="venueCity">City</Label>
                <Input
                  id="venueCity"
                  value={draft.venue?.city ?? ""}
                  onChange={(e) => updateVenue("city", e.target.value || undefined)}
                />
              </div>
            </div>

            {/* Service style */}
            <div>
              <Label htmlFor="serviceStyle">Service style</Label>
              <Input
                id="serviceStyle"
                placeholder="buffet, plated, family_style, stations…"
                value={draft.serviceStyle ?? ""}
                onChange={(e) => update("serviceStyle", e.target.value || null)}
              />
            </div>

            {/* Timeline */}
            <div className="border-t border-stone-200 pt-4">
              <h3 className="text-sm font-semibold text-stone-800 mb-3">Timeline</h3>
              <div className="space-y-3">
                <TimelineRow
                  label="Ceremony"
                  enabled={!!draft.hasCeremony}
                  start={draft.ceremonyStartTime ?? ""}
                  end={draft.ceremonyEndTime ?? ""}
                  onEnabledChange={(v) => update("hasCeremony", v)}
                  onStartChange={(v) => update("ceremonyStartTime", v || null)}
                  onEndChange={(v) => update("ceremonyEndTime", v || null)}
                />
                <TimelineRow
                  label="Cocktail hour"
                  enabled={!!draft.hasCocktailHour}
                  start={draft.cocktailStartTime ?? ""}
                  end={draft.cocktailEndTime ?? ""}
                  onEnabledChange={(v) => update("hasCocktailHour", v)}
                  onStartChange={(v) => update("cocktailStartTime", v || null)}
                  onEndChange={(v) => update("cocktailEndTime", v || null)}
                />
                <TimelineRow
                  label="Reception"
                  enabled={!!draft.hasMainMeal}
                  start={draft.mainMealStartTime ?? ""}
                  end={draft.mainMealEndTime ?? ""}
                  onEnabledChange={(v) => update("hasMainMeal", v)}
                  onStartChange={(v) => update("mainMealStartTime", v || null)}
                  onEndChange={(v) => update("mainMealEndTime", v || null)}
                />
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════ MENU ═══════════════ */}
          <TabsContent value="menu" className="space-y-6 mt-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Menu items</Label>
                <Button variant="ghost" size="sm" onClick={addMenuItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add item
                </Button>
              </div>
              {draft.menuSelections.length === 0 && (
                <p className="text-xs text-stone-500 italic py-2">
                  No menu items yet. Add courses to build out the menu card.
                </p>
              )}
              <div className="space-y-2">
                {draft.menuSelections.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-stone-50 rounded-md p-2 border"
                  >
                    <GripVertical className="h-4 w-4 text-stone-400 shrink-0" />
                    <Input
                      className="flex-1"
                      placeholder="Item name (e.g. Pan-seared salmon)"
                      value={m.name}
                      onChange={(e) => updateMenuItem(i, { name: e.target.value })}
                    />
                    <select
                      className="text-sm border rounded px-2 py-2 bg-white shrink-0"
                      value={m.category}
                      onChange={(e) =>
                        updateMenuItem(i, { category: e.target.value })
                      }
                    >
                      {MENU_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMenuItem(i)}
                    >
                      <Trash2 className="h-4 w-4 text-stone-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Appetizers / Cocktail hour bites</Label>
                <Button variant="ghost" size="sm" onClick={addAppetizer}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {draft.appetizers.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-stone-50 rounded-md p-2 border"
                  >
                    <Input
                      className="flex-1"
                      placeholder="Appetizer name"
                      value={a.itemName}
                      onChange={(e) =>
                        updateAppetizer(i, { itemName: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      className="w-24 shrink-0"
                      placeholder="Qty"
                      value={a.quantity || ""}
                      onChange={(e) =>
                        updateAppetizer(i, {
                          quantity: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAppetizer(i)}
                    >
                      <Trash2 className="h-4 w-4 text-stone-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Desserts</Label>
                <Button variant="ghost" size="sm" onClick={addDessert}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {draft.desserts.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-stone-50 rounded-md p-2 border"
                  >
                    <Input
                      className="flex-1"
                      placeholder="Dessert name"
                      value={d.itemName}
                      onChange={(e) =>
                        updateDessert(i, { itemName: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      className="w-24 shrink-0"
                      placeholder="Qty"
                      value={d.quantity || ""}
                      onChange={(e) =>
                        updateDessert(i, {
                          quantity: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDessert(i)}
                    >
                      <Trash2 className="h-4 w-4 text-stone-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════ PRICING ═══════════════ */}
          <TabsContent value="pricing" className="space-y-5 mt-5">
            <div>
              <Label htmlFor="perPerson">Per-person price (optional)</Label>
              <p className="text-xs text-stone-500 mb-1.5">
                If set, the investment card shows &ldquo;Catering · $X × guests&rdquo;
                instead of individual line items.
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
                  $
                </span>
                <Input
                  id="perPerson"
                  type="number"
                  step="0.01"
                  min={0}
                  className="pl-7"
                  value={centsToDollars(draft.pricing.perPersonCents)}
                  onChange={(e) =>
                    updatePricing(
                      "perPersonCents",
                      e.target.value ? dollarsToCents(e.target.value) : undefined,
                    )
                  }
                />
              </div>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Line items</Label>
                <Button variant="ghost" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add line
                </Button>
              </div>
              <div className="space-y-2">
                {draft.lineItems.map((li, i) => (
                  <div
                    key={li.id ?? i}
                    className="flex items-center gap-2 bg-stone-50 rounded-md p-2 border"
                  >
                    <Input
                      className="flex-1"
                      placeholder="Description"
                      value={li.name}
                      onChange={(e) => updateLineItem(i, { name: e.target.value })}
                    />
                    <Input
                      type="number"
                      className="w-16 shrink-0"
                      placeholder="Qty"
                      value={li.quantity}
                      onChange={(e) =>
                        updateLineItem(i, {
                          quantity: parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-500 text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-6"
                        placeholder="Price"
                        value={centsToDollars(li.price)}
                        onChange={(e) =>
                          updateLineItem(i, {
                            price: dollarsToCents(e.target.value),
                          })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(i)}
                    >
                      <Trash2 className="h-4 w-4 text-stone-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-200 pt-4 space-y-3">
              <div>
                <Label htmlFor="serviceFee">Service fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
                    $
                  </span>
                  <Input
                    id="serviceFee"
                    type="number"
                    step="0.01"
                    min={0}
                    className="pl-7"
                    value={centsToDollars(draft.pricing.serviceFeeCents)}
                    onChange={(e) =>
                      updatePricing(
                        "serviceFeeCents",
                        e.target.value ? dollarsToCents(e.target.value) : undefined,
                      )
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tax">Tax</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
                    $
                  </span>
                  <Input
                    id="tax"
                    type="number"
                    step="0.01"
                    min={0}
                    className="pl-7"
                    value={centsToDollars(draft.pricing.taxCents)}
                    onChange={(e) =>
                      updatePricing("taxCents", dollarsToCents(e.target.value))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="depositPct">Deposit %</Label>
                <Input
                  id="depositPct"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.pricing.depositPercent ?? 35}
                  onChange={(e) =>
                    updatePricing(
                      "depositPercent",
                      Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                    )
                  }
                />
              </div>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <div className="flex justify-between text-sm text-stone-600">
                <span>Subtotal</span>
                <span className="tabular-nums">${(computed.subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-600">
                <span>Tax</span>
                <span className="tabular-nums">
                  ${(draft.pricing.taxCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-baseline mt-2 pt-2 border-t">
                <span className="font-semibold text-stone-900">Total</span>
                <span className="font-semibold text-2xl tabular-nums text-stone-900">
                  ${(computed.total / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════ NOTES ═══════════════ */}
          <TabsContent value="notes" className="space-y-5 mt-5">
            <div>
              <Label htmlFor="specialRequests">Special requests</Label>
              <p className="text-xs text-stone-500 mb-1.5">
                Shown in a dedicated card on the customer page, in quotes.
              </p>
              <Textarea
                id="specialRequests"
                rows={4}
                value={draft.specialRequests ?? ""}
                onChange={(e) =>
                  update("specialRequests", e.target.value || null)
                }
              />
            </div>
            <div>
              <Label htmlFor="customerNotes">Internal / customer notes</Label>
              <p className="text-xs text-stone-500 mb-1.5">
                Plain-text notes. Not currently rendered on the proposal page
                but saved alongside for your records.
              </p>
              <Textarea
                id="customerNotes"
                rows={4}
                value={draft.customerNotes ?? ""}
                onChange={(e) => update("customerNotes", e.target.value || null)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-6 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-br from-[#8B7355] to-[#E28C0A]"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TimelineRow({
  label,
  enabled,
  start,
  end,
  onEnabledChange,
  onStartChange,
  onEndChange,
}: {
  label: string;
  enabled: boolean;
  start: string;
  end: string;
  onEnabledChange: (v: boolean) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-32 shrink-0">
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Input
        type="time"
        className="flex-1"
        disabled={!enabled}
        value={start}
        onChange={(e) => onStartChange(e.target.value)}
      />
      <span className="text-stone-400">–</span>
      <Input
        type="time"
        className="flex-1"
        disabled={!enabled}
        value={end}
        onChange={(e) => onEndChange(e.target.value)}
      />
    </div>
  );
}
