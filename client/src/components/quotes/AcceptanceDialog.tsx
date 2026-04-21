/**
 * AcceptanceDialog
 *
 * Formalizes the quote-accept clickwrap so it holds up as a legally binding
 * e-signature (ESIGN / UETA) without needing BoldSign or another vendor.
 *
 * Two documents live in this dialog:
 *   1. Main T&Cs — required. Gates the Accept button. Includes the alcohol
 *      policy paragraph only when the quote has bar service booked.
 *   2. Leftover Food Release — optional. If unchecked, the booking still
 *      proceeds but the kitchen does not send leftovers home day-of.
 *
 * The server writes an acceptance_audit_log row capturing typed name, IP,
 * user-agent, token used, the T&Cs snapshot/version, and which specific
 * documents were accepted (via acceptedDocs[]).
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck, FileText } from "lucide-react";

type Doc = {
  docId: string;
  version: string;
  heading: string;
  body: string;
  pdfUrl: string;
};

type TermsPayload = {
  main: Doc;
  leftoverRelease: Doc;
  hasBarService?: boolean;
  // Legacy flat fields (older callers).
  version?: string;
  heading?: string;
  body?: string;
};

export type AcceptedDoc = { docId: string; version: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedName?: string | null;
  submitting?: boolean;
  /** Token from the public URL so the terms endpoint can tailor the alcohol clause. */
  quoteToken?: string | null;
  onConfirm: (payload: { typedName: string; acceptedDocs: AcceptedDoc[] }) => void;
};

export function AcceptanceDialog({
  open,
  onOpenChange,
  expectedName,
  submitting = false,
  quoteToken = null,
  onConfirm,
}: Props) {
  const [typedName, setTypedName] = useState("");
  const [agreedMain, setAgreedMain] = useState(false);
  const [agreedLeftover, setAgreedLeftover] = useState(false);
  const [terms, setTerms] = useState<TermsPayload | null>(null);
  const [termsLoading, setTermsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTypedName("");
    setAgreedMain(false);
    setAgreedLeftover(false);
    setTermsLoading(true);
    const url = quoteToken ? `/api/public/terms?token=${encodeURIComponent(quoteToken)}` : "/api/public/terms";
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => setTerms(t))
      .catch(() => setTerms(null))
      .finally(() => setTermsLoading(false));
  }, [open, quoteToken]);

  const trimmedName = typedName.trim();
  const nameLooksValid = trimmedName.length >= 2 && /\s/.test(trimmedName);
  const canSubmit = agreedMain && nameLooksValid && !submitting;

  const nameMismatch =
    !!expectedName &&
    nameLooksValid &&
    !trimmedName.toLowerCase().includes(expectedName.trim().toLowerCase().split(/\s+/)[0] ?? "");

  // Back-compat: server now returns { main, leftoverRelease } but older
  // deploys may still send flat { version, heading, body }.
  const mainDoc: Doc | null = terms?.main
    ? terms.main
    : terms?.version && terms?.body
      ? {
          docId: "terms",
          version: terms.version,
          heading: terms.heading || "Terms & Conditions",
          body: terms.body,
          pdfUrl: "/api/public/terms/pdf",
        }
      : null;
  const leftoverDoc: Doc | null = terms?.leftoverRelease ?? null;

  const handleConfirm = () => {
    if (!canSubmit || !mainDoc) return;
    const docs: AcceptedDoc[] = [{ docId: mainDoc.docId, version: mainDoc.version }];
    if (agreedLeftover && leftoverDoc) {
      docs.push({ docId: leftoverDoc.docId, version: leftoverDoc.version });
    }
    onConfirm({ typedName: trimmedName, acceptedDocs: docs });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-[color:var(--theme-primary)]" />
            {mainDoc?.heading ?? "Terms & Conditions"}
          </DialogTitle>
          <DialogDescription>
            Please read the terms below and type your full name to sign.
          </DialogDescription>
        </DialogHeader>

        {/* Main T&Cs — scrollable block */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap font-serif">
          {termsLoading
            ? "Loading terms…"
            : mainDoc?.body ?? "Standard Home Bites Catering terms apply."}
        </div>
        <div className="flex items-center justify-between -mt-2 text-xs text-gray-500">
          {mainDoc?.version && <span>Terms version {mainDoc.version}</span>}
          {mainDoc?.pdfUrl && (
            <a
              href={mainDoc.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline hover:text-gray-700"
            >
              <FileText className="h-3 w-3" />
              Download Terms & Conditions
            </a>
          )}
        </div>

        {/* Required agreement */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <Checkbox
            checked={agreedMain}
            onCheckedChange={(v) => setAgreedMain(v === true)}
            className="mt-0.5"
            data-testid="checkbox-agree-main"
          />
          <span className="text-sm text-gray-800 leading-snug">
            I've read the Terms & Conditions and understand that typing my
            name and clicking
            <strong> Accept </strong>
            creates a legally binding agreement between me and Homebites
            Catering, equivalent to a handwritten signature under the US ESIGN
            Act and UETA.
          </span>
        </label>

        {/* Optional leftover-release waiver */}
        {leftoverDoc && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-amber-900">
                Optional — {leftoverDoc.heading}
              </div>
              <a
                href={leftoverDoc.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs underline text-amber-900 hover:text-amber-950"
              >
                <FileText className="h-3 w-3" />
                Download
              </a>
            </div>
            <div className="rounded-md bg-white border border-amber-100 p-3 max-h-32 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
              {leftoverDoc.body}
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <Checkbox
                checked={agreedLeftover}
                onCheckedChange={(v) => setAgreedLeftover(v === true)}
                className="mt-0.5"
                data-testid="checkbox-agree-leftover"
              />
              <span className="text-sm text-amber-900 leading-snug">
                I agree to the Leftover Food Release of Liability. I understand
                that if I do not check this box, Homebites will not send
                leftover food home from the event.
              </span>
            </label>
          </div>
        )}

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
            onClick={handleConfirm}
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
