/**
 * AcceptanceDialog
 *
 * Formalizes the quote-accept clickwrap so it holds up as a legally binding
 * e-signature (ESIGN / UETA) without needing BoldSign or another vendor.
 *
 * Flow:
 *   1. Customer reads the full T&Cs (scrollable, fetched from /api/public/terms).
 *   2. Must tick the "I understand this is legally binding" checkbox.
 *   3. Must type their full legal name (min 2 chars, warns if clearly off
 *      from the name on the quote — soft nudge, not a blocker).
 *   4. On submit, typed name is passed back and the accept mutation fires.
 *
 * The server writes an acceptance_audit_log row capturing typed name, IP,
 * user-agent, token used, and the T&Cs snapshot/version in effect.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck } from "lucide-react";

type TermsPayload = {
  version: string;
  heading: string;
  body: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedName?: string | null;
  submitting?: boolean;
  onConfirm: (typedName: string) => void;
};

export function AcceptanceDialog({
  open,
  onOpenChange,
  expectedName,
  submitting = false,
  onConfirm,
}: Props) {
  const [typedName, setTypedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [terms, setTerms] = useState<TermsPayload | null>(null);
  const [termsLoading, setTermsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTypedName("");
    setAgreed(false);
    setTermsLoading(true);
    fetch("/api/public/terms")
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => setTerms(t))
      .catch(() => setTerms(null))
      .finally(() => setTermsLoading(false));
  }, [open]);

  const trimmedName = typedName.trim();
  const nameLooksValid = trimmedName.length >= 2 && /\s/.test(trimmedName);
  const canSubmit = agreed && nameLooksValid && !submitting;

  // Soft warning when typed name differs noticeably from the name on the
  // quote. Doesn't block — someone else in the household may be signing.
  const nameMismatch =
    !!expectedName &&
    nameLooksValid &&
    !trimmedName.toLowerCase().includes(expectedName.trim().toLowerCase().split(/\s+/)[0] ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-[color:var(--theme-primary)]" />
            {terms?.heading ?? "Terms & Conditions"}
          </DialogTitle>
          <DialogDescription>
            Please read the terms below and type your full name to sign.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable T&Cs block */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 max-h-72 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap font-serif">
          {termsLoading
            ? "Loading terms…"
            : terms?.body ?? "Standard Home Bites Catering terms apply."}
        </div>
        {terms?.version && (
          <p className="text-xs text-gray-500 -mt-2">
            Terms version {terms.version}
          </p>
        )}

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <Checkbox
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-gray-800 leading-snug">
            I've read these terms and understand that typing my name and clicking
            <strong> Accept </strong>
            creates a legally binding agreement between me and Homebites
            Catering, equivalent to a handwritten signature under the US ESIGN
            Act and UETA.
          </span>
        </label>

        {/* Typed-name input */}
        <div className="space-y-1.5">
          <Label htmlFor="typedName" className="text-sm font-semibold">
            Type your full legal name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="typedName"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={expectedName || "First Last"}
            autoComplete="name"
          />
          {nameMismatch && (
            <p className="text-xs text-amber-700">
              Name looks different from the name on the quote ({expectedName}).
              That's okay — anyone authorized can sign — but double-check.
            </p>
          )}
          {!nameLooksValid && trimmedName.length > 0 && (
            <p className="text-xs text-red-600">
              Please type your full name (first and last).
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => canSubmit && onConfirm(trimmedName)}
            disabled={!canSubmit}
            className="min-w-32"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing…
              </>
            ) : (
              "Accept & Sign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
