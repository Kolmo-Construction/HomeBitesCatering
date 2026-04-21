/**
 * PDF Quote Generation.
 *
 * Renders a branded, per-event-type proposal PDF using PDFKit. Pulls colors
 * and copy from the event preset so a wedding PDF looks different from a
 * corporate one without forking the renderer.
 *
 * Layout beats (top to bottom):
 *   1. Logo strip + contact line
 *   2. Colored banner with the proposal kicker + couple/person/company title
 *   3. Event details two-column block
 *   4. Menu sections (selections, appetizers, desserts) with cream kicker tiles
 *   5. What's Included checklist
 *   6. Chef's note in a cream panel
 *   7. Pricing breakdown + totals panel (accent fill)
 *   8. Special requests
 *   9. Footer in a cream band
 */
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { getSiteConfig } from "../utils/siteConfig";
import type { Proposal } from "@shared/proposal";
import { getEventPreset, derivePdfPaletteFromTheme } from "@shared/eventPresets";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | Date | null): string {
  if (!iso) return "Date TBD";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// Resolved once at import time; fall back to null so missing asset doesn't crash.
const LOGO_PATH = path.resolve(process.cwd(), "attached_assets/logo.png");
const logoBuffer: Buffer | null = (() => {
  try {
    return fs.readFileSync(LOGO_PATH);
  } catch {
    return null;
  }
})();

export async function generateQuotePDF(proposal: Proposal, quote: any, client: any): Promise<Buffer> {
  const config = getSiteConfig();
  const preset = getEventPreset(proposal.eventType || quote.eventType);
  const { copy, defaults, pdfBranding, theme } = preset;
  // Prefer the per-type PDF palette when defined (print-tuned colors), but fall
  // back to deriving from the web theme so new event types don't have to
  // maintain two color sets. A future change to `preset.theme` automatically
  // reaches the PDF when pdfBranding is absent.
  const basePalette = pdfBranding?.palette ?? derivePdfPaletteFromTheme(theme);
  // Per-quote branding overrides. Hex strings from the admin drawer. Only
  // override the keys the admin actually set; other palette slots stay on
  // the preset so the PDF remains coherent.
  const branding = (proposal as any).branding as
    | { primary?: string | null; accent?: string | null; background?: string | null }
    | null
    | undefined;
  const palette = {
    ...basePalette,
    ...(branding?.primary ? { primary: branding.primary, headerText: branding.primary } : {}),
    ...(branding?.accent ? { accent: branding.accent } : {}),
    ...(branding?.background ? { background: branding.background } : {}),
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = doc.page.width;
    const LEFT = 50;
    const RIGHT = PAGE_W - 50;
    const W = RIGHT - LEFT;

    // ─── Logo strip ────────────────────────────────────────────────────────
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, LEFT, 40, { fit: [120, 40] });
      } catch {
        // ignore — fall back to text header below
      }
    }
    doc.fontSize(9).font("Helvetica").fillColor(palette.muted)
      .text(`${config.phone} · ${config.email} · ${config.website}`, LEFT, 52, { width: W, align: "right" });
    doc.y = 95;

    // ─── Colored title banner ──────────────────────────────────────────────
    const bannerY = doc.y;
    const bannerH = 110;
    doc.rect(LEFT, bannerY, W, bannerH).fill(palette.background);
    // Accent rule at banner top + bottom
    doc.rect(LEFT, bannerY, W, 3).fill(palette.accent);
    doc.rect(LEFT, bannerY + bannerH - 3, W, 3).fill(palette.accent);

    const personContext = {
      firstName: proposal.firstName,
      lastName: proposal.lastName,
      partnerFirstName: proposal.partnerFirstName,
      partnerLastName: proposal.partnerLastName,
      company: (client?.company as string | null | undefined) ?? null,
    };
    const displayTitle = copy.displayTitle(personContext) || "Your Event";

    doc.fontSize(10).font("Helvetica-Bold").fillColor(palette.primary)
      .text(copy.proposalKicker.toUpperCase(), LEFT, bannerY + 22, { width: W, align: "center", characterSpacing: 2.5 });
    doc.fontSize(24).font("Helvetica-Bold").fillColor(palette.headerText)
      .text(displayTitle, LEFT, bannerY + 44, { width: W, align: "center" });
    doc.fontSize(10).font("Helvetica-Oblique").fillColor(palette.muted)
      .text(formatDate(proposal.eventDate), LEFT, bannerY + 82, { width: W, align: "center" });

    doc.y = bannerY + bannerH + 20;

    // ─── Event Details (two-column grid) ───────────────────────────────────
    const details: [string, string][] = [];
    if (proposal.eventDate) details.push(["Date", formatDate(proposal.eventDate)]);
    if (proposal.guestCount) details.push(["Guests", `${proposal.guestCount}`]);
    if (proposal.venue?.name) details.push(["Venue", proposal.venue.name]);
    if (proposal.serviceType) details.push(["Service", titleCase(proposal.serviceType)]);
    if (proposal.serviceStyle) details.push(["Style", titleCase(proposal.serviceStyle)]);
    if (proposal.menuTheme) {
      details.push(["Menu", `${titleCase(proposal.menuTheme)}${proposal.menuTier ? ` · ${titleCase(proposal.menuTier)}` : ""}`]);
    }

    if (details.length > 0) {
      const colW = W / 2;
      const rowH = 22;
      const rows = Math.ceil(details.length / 2);
      for (let i = 0; i < details.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = LEFT + col * colW;
        const y = doc.y + row * rowH;
        doc.fontSize(8).font("Helvetica-Bold").fillColor(palette.muted)
          .text(details[i][0].toUpperCase(), x, y, { width: colW - 10, characterSpacing: 1 });
        doc.fontSize(11).font("Helvetica").fillColor(palette.bodyText)
          .text(details[i][1], x, y + 10, { width: colW - 10 });
      }
      doc.y += rows * rowH + 10;
    }

    // ─── Section header helper ─────────────────────────────────────────────
    const sectionHeader = (title: string) => {
      doc.moveDown(0.5);
      const y = doc.y;
      doc.rect(LEFT, y, 3, 16).fill(palette.accent);
      doc.fontSize(13).font("Helvetica-Bold").fillColor(palette.headerText)
        .text(title, LEFT + 10, y + 1, { width: W - 10 });
      doc.y = y + 22;
    };

    // ─── Menu Selections ───────────────────────────────────────────────────
    if (proposal.menuSelections && proposal.menuSelections.length > 0) {
      sectionHeader("Menu Selections");
      for (const item of proposal.menuSelections) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(palette.bodyText)
          .text(`•  ${item.name}`, LEFT + 4, doc.y, { width: W - 8 });
        if (item.category) {
          doc.fontSize(8).font("Helvetica").fillColor(palette.muted)
            .text(`   ${titleCase(item.category)}`, { width: W - 8 });
        }
        if (item.description) {
          doc.fontSize(9).font("Helvetica-Oblique").fillColor(palette.muted)
            .text(`   ${item.description}`, { width: W - 8 });
        }
        doc.moveDown(0.2);
      }
      doc.moveDown(0.4);
    }

    // ─── Appetizers ────────────────────────────────────────────────────────
    if (proposal.appetizers && proposal.appetizers.length > 0) {
      sectionHeader("Appetizers");
      for (const app of proposal.appetizers) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(palette.bodyText)
          .text(`•  ${app.itemName}  ×  ${app.quantity}`, LEFT + 4, doc.y, { width: W - 8 });
        if (app.description) {
          doc.fontSize(9).font("Helvetica-Oblique").fillColor(palette.muted)
            .text(`   ${app.description}`, { width: W - 8 });
        }
        doc.moveDown(0.2);
      }
      doc.moveDown(0.4);
    }

    // ─── Desserts ──────────────────────────────────────────────────────────
    if (proposal.desserts && proposal.desserts.length > 0) {
      sectionHeader("Desserts");
      for (const d of proposal.desserts) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(palette.bodyText)
          .text(`•  ${d.itemName}  ×  ${d.quantity}`, LEFT + 4, doc.y, { width: W - 8 });
        if (d.description) {
          doc.fontSize(9).font("Helvetica-Oblique").fillColor(palette.muted)
            .text(`   ${d.description}`, { width: W - 8 });
        }
        doc.moveDown(0.2);
      }
      doc.moveDown(0.4);
    }

    // ─── What's Included ───────────────────────────────────────────────────
    const whatsIncluded =
      proposal.whatsIncluded && proposal.whatsIncluded.length > 0
        ? proposal.whatsIncluded
        : defaults.whatsIncluded(proposal.serviceStyle);
    if (whatsIncluded.length > 0) {
      sectionHeader("What's Included");
      for (const line of whatsIncluded) {
        const y = doc.y;
        doc.fontSize(10).font("Helvetica-Bold").fillColor(palette.accent)
          .text("✓", LEFT + 4, y, { width: 12 });
        doc.fontSize(10).font("Helvetica").fillColor(palette.bodyText)
          .text(line, LEFT + 20, y, { width: W - 20 });
        doc.moveDown(0.15);
      }
      doc.moveDown(0.4);
    }

    // ─── Chef's Note (cream panel) ─────────────────────────────────────────
    const chefNote = proposal.chefNote ?? {
      firstName: config.chef.firstName,
      role: config.chef.role,
      message: config.chef.bio,
      photoUrl: config.chef.photoUrl,
    };
    if (chefNote?.firstName && chefNote?.message) {
      doc.moveDown(0.4);
      // Measure to size the panel
      const panelPadding = 14;
      const startY = doc.y;
      // Render text into a scratch buffer first would be ideal; instead, just draw
      // the panel after we know the final Y. Use a two-pass approach: render text,
      // capture heights, then the surrounding rectangle.
      const titleText = `A note from ${chefNote.firstName}`;
      const signoff = `— ${chefNote.firstName}${chefNote.role ? ", " + chefNote.role : ""}`;

      const innerX = LEFT + panelPadding;
      const innerW = W - panelPadding * 2;

      // Temp render to measure height
      const measureDoc = doc;
      const savedY = measureDoc.y;
      measureDoc.fontSize(11).font("Helvetica-Bold").text(titleText, innerX, savedY + panelPadding, { width: innerW });
      measureDoc.moveDown(0.25);
      measureDoc.fontSize(10).font("Helvetica").text(chefNote.message, { width: innerW });
      measureDoc.moveDown(0.2);
      measureDoc.fontSize(9).font("Helvetica-Oblique").text(signoff, { width: innerW });
      const endY = measureDoc.y + panelPadding;
      const panelH = endY - startY;

      // Draw the panel behind — we need to re-paint the text on top since the rect
      // will cover it. Easier approach: save the current buffer position using a
      // different strategy. Here we draw the panel first on a "fresh" block, by
      // rewinding Y and redrawing.
      measureDoc.y = startY;
      doc.rect(LEFT, startY, W, panelH).fill(palette.background);
      doc.rect(LEFT, startY, 4, panelH).fill(palette.accent);
      doc.fillColor(palette.headerText).fontSize(11).font("Helvetica-Bold")
        .text(titleText, innerX, startY + panelPadding, { width: innerW });
      doc.moveDown(0.25);
      doc.fontSize(10).font("Helvetica").fillColor(palette.bodyText)
        .text(chefNote.message, { width: innerW });
      doc.moveDown(0.2);
      doc.fontSize(9).font("Helvetica-Oblique").fillColor(palette.muted)
        .text(signoff, { width: innerW });
      doc.y = startY + panelH + 6;
    }

    // ─── Line Items / Pricing ──────────────────────────────────────────────
    if (proposal.lineItems && proposal.lineItems.length > 0) {
      sectionHeader("Pricing Breakdown");

      // Table header
      doc.fontSize(8).font("Helvetica-Bold").fillColor(palette.muted);
      const col1 = LEFT + 4;
      const col2 = RIGHT - 180;
      const col3 = RIGHT - 110;
      const col4 = RIGHT - 60;
      const headerY = doc.y;
      doc.text("ITEM", col1, headerY, { width: col2 - col1 - 10, characterSpacing: 1 });
      doc.text("QTY", col2, headerY, { width: 60, align: "right", characterSpacing: 1 });
      doc.text("PRICE", col3, headerY, { width: 50, align: "right", characterSpacing: 1 });
      doc.text("TOTAL", col4, headerY, { width: 60, align: "right", characterSpacing: 1 });
      doc.y = headerY + 14;
      doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor(palette.rule).lineWidth(0.5).stroke();
      doc.moveDown(0.3);

      doc.fontSize(10).font("Helvetica").fillColor(palette.bodyText);
      for (const item of proposal.lineItems) {
        const y = doc.y;
        doc.text(item.name, col1, y, { width: col2 - col1 - 10 });
        const rowY = y; // name can wrap — keep numbers on first line
        doc.text(`${item.quantity}`, col2, rowY, { width: 60, align: "right" });
        doc.text(formatCents(item.price), col3, rowY, { width: 50, align: "right" });
        doc.text(formatCents(item.price * item.quantity), col4, rowY, { width: 60, align: "right" });
        doc.moveDown(0.3);
      }
    }

    // ─── Custom Sections (admin-authored free-text blocks) ─────────────────
    const customSections = (proposal as any).customSections as
      | Array<{ title: string; body: string }>
      | undefined;
    if (customSections && customSections.length > 0) {
      for (const s of customSections) {
        if (!s || (!s.title?.trim() && !s.body?.trim())) continue;
        doc.moveDown(0.6);
        if (s.title) sectionHeader(s.title);
        if (s.body) {
          doc.fontSize(10).font("Helvetica").fillColor(palette.bodyText)
            .text(s.body, LEFT + 4, doc.y, { width: W - 8, lineGap: 2 });
        }
      }
    }

    // ─── Totals panel (accent fill) ────────────────────────────────────────
    doc.moveDown(0.4);
    const pricing = proposal.pricing;
    const discountCents = Math.max(0, (pricing as any).discountCents || 0);
    const discountLabel = ((pricing as any).discountLabel as string | undefined) || "Discount";
    const totalsRows: Array<[string, number, boolean]> = [];
    if (discountCents > 0) totalsRows.push([discountLabel, -discountCents, false]);
    if (pricing.subtotalCents) totalsRows.push(["Subtotal", pricing.subtotalCents, false]);
    if (pricing.serviceFeeCents) totalsRows.push(["Service Fee", pricing.serviceFeeCents, false]);
    if (pricing.taxCents) totalsRows.push(["Tax", pricing.taxCents, false]);
    totalsRows.push(["Total", pricing.totalCents, true]);

    const panelX = LEFT + W / 2;
    const panelW = W / 2;
    const rowH = 18;
    const panelPadY = 10;
    const panelH = panelPadY * 2 + totalsRows.length * rowH;
    const panelY = doc.y;

    doc.rect(panelX, panelY, panelW, panelH).fill(palette.background);
    doc.rect(panelX, panelY, panelW, 3).fill(palette.accent);

    let rowY = panelY + panelPadY;
    for (const [label, cents, isTotal] of totalsRows) {
      if (isTotal) {
        doc.fontSize(13).font("Helvetica-Bold").fillColor(palette.headerText);
      } else {
        doc.fontSize(10).font("Helvetica").fillColor(palette.bodyText);
      }
      doc.text(label, panelX + 12, rowY, { width: panelW / 2 });
      const display = cents < 0 ? `−${formatCents(-cents)}` : formatCents(cents);
      doc.text(display, panelX + panelW / 2, rowY, { width: panelW / 2 - 12, align: "right" });
      rowY += rowH;
    }
    doc.y = panelY + panelH + 8;

    if (pricing.depositPercent) {
      doc.fontSize(9).font("Helvetica-Oblique").fillColor(palette.muted);
      const depositCents = Math.round(pricing.totalCents * (pricing.depositPercent / 100));
      doc.text(
        `Deposit due (${pricing.depositPercent}%): ${formatCents(depositCents)}`,
        panelX, doc.y, { width: panelW, align: "right" }
      );
    }

    // ─── Special Requests ──────────────────────────────────────────────────
    if (proposal.specialRequests) {
      doc.moveDown(1);
      sectionHeader("Special Requests");
      doc.fontSize(10).font("Helvetica").fillColor(palette.bodyText)
        .text(proposal.specialRequests, LEFT + 4, doc.y, { width: W - 8 });
    }

    // ─── Footer (cream band) ───────────────────────────────────────────────
    doc.moveDown(2);
    const footerY = Math.max(doc.y, doc.page.height - 110);
    const footerH = 70;
    doc.rect(LEFT, footerY, W, footerH).fill(palette.background);
    doc.rect(LEFT, footerY, W, 2).fill(palette.accent);

    doc.fontSize(9).font("Helvetica-Bold").fillColor(palette.primary)
      .text(config.businessName, LEFT, footerY + 14, { width: W, align: "center", characterSpacing: 1.5 });
    doc.fontSize(9).font("Helvetica").fillColor(palette.bodyText)
      .text(`${config.address}`, LEFT, footerY + 30, { width: W, align: "center" });
    doc.text(`${config.phone} · ${config.email} · ${config.website}`, LEFT, footerY + 44, { width: W, align: "center" });
    doc.fontSize(8).font("Helvetica-Oblique").fillColor(palette.muted)
      .text("Pricing valid for 30 days from the date of issue.", LEFT, footerY + 58, { width: W, align: "center" });

    doc.end();
  });
}
