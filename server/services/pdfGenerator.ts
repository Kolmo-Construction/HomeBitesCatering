/**
 * Tier 3, Item 12: PDF Quote Generation
 *
 * Generates a downloadable PDF from a Proposal + Quote using PDFKit.
 * Returns a Buffer that can be piped to the response.
 */
import PDFDocument from "pdfkit";
import { getSiteConfig } from "../utils/siteConfig";
import type { Proposal } from "@shared/proposal";
import { getEventCopy } from "@shared/eventCopy";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | Date | null): string {
  if (!iso) return "Date TBD";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function defaultWhatsIncluded(serviceStyle?: string | null): string[] {
  const base = [
    "Full menu planning with one round of revisions",
    "Complimentary tasting for the couple",
    "On-site cooking and plating by our kitchen team",
    "Professional service staff for the event",
    "Setup of serving lines, chafing dishes, and presentation ware",
    "Full breakdown and cleanup of our equipment after service",
    "Dedicated event coordinator from booking through the day-of",
  ];
  switch ((serviceStyle || "").toLowerCase()) {
    case "plated":
      return [
        "Full menu planning with one round of revisions",
        "Complimentary tasting for the couple",
        "Course-by-course plating in our on-site kitchen",
        "Captain + servers to coordinate plated service with your venue",
        "Setup of plating stations, bussing, and between-course resets",
        "Full breakdown and cleanup of our equipment after service",
        "Dedicated event coordinator from booking through the day-of",
      ];
    case "family_style":
      return [
        "Full menu planning with one round of revisions",
        "Complimentary tasting for the couple",
        "Family-style platters built and refreshed throughout service",
        "Service staff to coordinate platter flow with your venue",
        "Setup of communal platters, utensils, and replenishments",
        "Full breakdown and cleanup of our equipment after service",
        "Dedicated event coordinator from booking through the day-of",
      ];
    case "cocktail_party":
    case "stations":
      return [
        "Full menu planning with one round of revisions",
        "Complimentary tasting for the couple",
        "On-site cooking at stations / passed hors d'oeuvres by our kitchen team",
        "Service staff to pass and replenish throughout the event",
        "Setup of stations, serving platters, and presentation ware",
        "Full breakdown and cleanup of our equipment after service",
        "Dedicated event coordinator from booking through the day-of",
      ];
    default:
      return base;
  }
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateQuotePDF(proposal: Proposal, quote: any, client: any): Promise<Buffer> {
  const config = getSiteConfig();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 100; // usable width

    // ─── Header ────────────────────────────────────────────────────────────
    doc.fontSize(22).font("Helvetica-Bold").text(config.businessName, { align: "center" });
    doc.fontSize(10).font("Helvetica-Oblique").fillColor("#666")
      .text(config.tagline, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica").fillColor("#888")
      .text(`${config.address} · ${config.phone} · ${config.email}`, { align: "center" });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor("#ddd").lineWidth(1).stroke();
    doc.moveDown(1);

    // ─── Proposal Title ────────────────────────────────────────────────────
    const copy = getEventCopy(proposal.eventType || quote.eventType);
    const personContext = {
      firstName: proposal.firstName,
      lastName: proposal.lastName,
      partnerFirstName: proposal.partnerFirstName,
      partnerLastName: proposal.partnerLastName,
    };
    const displayTitle = copy.displayTitle(personContext);
    // Kicker (e.g., "A Corporate Event Proposal") + title
    doc.fontSize(10).font("Helvetica").fillColor("#8B7355")
      .text(copy.proposalKicker.toUpperCase(), { align: "center", characterSpacing: 2 });
    doc.moveDown(0.3);
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#111")
      .text(displayTitle, { align: "center" });
    doc.moveDown(0.5);

    // ─── Event Details ─────────────────────────────────────────────────────
    doc.fontSize(11).font("Helvetica").fillColor("#333");

    const details: [string, string][] = [];
    if (proposal.eventDate) details.push(["Date", formatDate(proposal.eventDate)]);
    if (proposal.guestCount) details.push(["Guests", `${proposal.guestCount}`]);
    if (proposal.venue?.name) details.push(["Venue", proposal.venue.name]);
    if (proposal.serviceType) details.push(["Service", titleCase(proposal.serviceType)]);
    if (proposal.serviceStyle) details.push(["Style", titleCase(proposal.serviceStyle)]);
    if (proposal.menuTheme) details.push(["Menu", `${titleCase(proposal.menuTheme)} (${titleCase(proposal.menuTier || "")})`]);

    for (const [label, value] of details) {
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(value);
    }

    doc.moveDown(1);

    // ─── Menu Selections ───────────────────────────────────────────────────
    if (proposal.menuSelections && proposal.menuSelections.length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#111").text("Menu Selections");
      doc.moveDown(0.3);

      for (const item of proposal.menuSelections) {
        doc.fontSize(10).font("Helvetica").fillColor("#333")
          .text(`  •  ${item.name}${item.category ? ` (${item.category})` : ""}`);
        if (item.description) {
          doc.fontSize(9).font("Helvetica-Oblique").fillColor("#666")
            .text(`       ${item.description}`, { indent: 0 });
        }
      }
      doc.moveDown(0.8);
    }

    // ─── Appetizers ────────────────────────────────────────────────────────
    if (proposal.appetizers && proposal.appetizers.length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#111").text("Appetizers");
      doc.moveDown(0.3);
      for (const app of proposal.appetizers) {
        doc.fontSize(10).font("Helvetica").fillColor("#333")
          .text(`  •  ${app.itemName} × ${app.quantity}`);
        if (app.description) {
          doc.fontSize(9).font("Helvetica-Oblique").fillColor("#666")
            .text(`       ${app.description}`);
        }
      }
      doc.moveDown(0.8);
    }

    // ─── Desserts ──────────────────────────────────────────────────────────
    if (proposal.desserts && proposal.desserts.length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#111").text("Desserts");
      doc.moveDown(0.3);
      for (const d of proposal.desserts) {
        doc.fontSize(10).font("Helvetica").fillColor("#333")
          .text(`  •  ${d.itemName} × ${d.quantity}`);
        if (d.description) {
          doc.fontSize(9).font("Helvetica-Oblique").fillColor("#666")
            .text(`       ${d.description}`);
        }
      }
      doc.moveDown(0.8);
    }

    // ─── What's Included ───────────────────────────────────────────────────
    const whatsIncluded =
      (proposal.whatsIncluded && proposal.whatsIncluded.length > 0
        ? proposal.whatsIncluded
        : defaultWhatsIncluded(proposal.serviceStyle)) || [];
    if (whatsIncluded.length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#111").text("What's Included");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor("#333");
      for (const line of whatsIncluded) {
        doc.text(`  ✓  ${line}`);
      }
      doc.moveDown(0.8);
    }

    // ─── Chef's Note ───────────────────────────────────────────────────────
    const chefNote = proposal.chefNote ?? {
      firstName: config.chef.firstName,
      role: config.chef.role,
      message: config.chef.bio,
      photoUrl: config.chef.photoUrl,
    };
    if (chefNote?.firstName && chefNote?.message) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#111")
        .text(`A note from ${chefNote.firstName}`);
      doc.moveDown(0.25);
      doc.fontSize(10).font("Helvetica").fillColor("#444")
        .text(chefNote.message, { align: "left" });
      doc.moveDown(0.2);
      doc.fontSize(9).font("Helvetica-Oblique").fillColor("#666")
        .text(`— ${chefNote.firstName}${chefNote.role ? ", " + chefNote.role : ""}`);
      doc.moveDown(0.8);
    }

    // ─── Line Items / Pricing ──────────────────────────────────────────────
    if (proposal.lineItems && proposal.lineItems.length > 0) {
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor("#ddd").lineWidth(1).stroke();
      doc.moveDown(0.8);

      doc.fontSize(13).font("Helvetica-Bold").fillColor("#111").text("Pricing Breakdown");
      doc.moveDown(0.5);

      // Table header
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#666");
      const col1 = 50;
      const col2 = 350;
      const col3 = 420;
      const col4 = 490;
      doc.text("Item", col1, doc.y, { width: 290 });
      doc.text("Qty", col2, doc.y, { width: 60, align: "right" });
      doc.text("Price", col3, doc.y, { width: 60, align: "right" });
      doc.text("Total", col4, doc.y, { width: 60, align: "right" });
      doc.moveDown(0.5);

      doc.fontSize(10).font("Helvetica").fillColor("#333");
      for (const item of proposal.lineItems) {
        const y = doc.y;
        doc.text(item.name, col1, y, { width: 290 });
        doc.text(`${item.quantity}`, col2, y, { width: 60, align: "right" });
        doc.text(formatCents(item.price), col3, y, { width: 60, align: "right" });
        doc.text(formatCents(item.price * item.quantity), col4, y, { width: 60, align: "right" });
        doc.moveDown(0.3);
      }
    }

    // ─── Totals ────────────────────────────────────────────────────────────
    doc.moveDown(0.5);
    doc.moveTo(350, doc.y).lineTo(50 + W, doc.y).strokeColor("#ddd").lineWidth(1).stroke();
    doc.moveDown(0.5);

    const pricing = proposal.pricing;
    doc.fontSize(10).font("Helvetica").fillColor("#333");

    if (pricing.subtotalCents) {
      doc.text("Subtotal", 350, doc.y, { width: 80, continued: false });
      doc.text(formatCents(pricing.subtotalCents), 430, doc.y - doc.currentLineHeight(), { width: 120, align: "right" });
    }
    if (pricing.serviceFeeCents) {
      doc.text("Service Fee", 350, doc.y, { width: 80 });
      doc.text(formatCents(pricing.serviceFeeCents), 430, doc.y - doc.currentLineHeight(), { width: 120, align: "right" });
    }
    if (pricing.taxCents) {
      doc.text("Tax", 350, doc.y, { width: 80 });
      doc.text(formatCents(pricing.taxCents), 430, doc.y - doc.currentLineHeight(), { width: 120, align: "right" });
    }

    doc.moveDown(0.3);
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#111");
    doc.text("Total", 350, doc.y, { width: 80 });
    doc.text(formatCents(pricing.totalCents), 430, doc.y - doc.currentLineHeight(), { width: 120, align: "right" });

    if (pricing.depositPercent) {
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").fillColor("#666");
      const depositCents = Math.round(pricing.totalCents * (pricing.depositPercent / 100));
      doc.text(`Deposit due (${pricing.depositPercent}%): ${formatCents(depositCents)}`, 350, doc.y, { width: 200, align: "right" });
    }

    // ─── Special Requests ──────────────────────────────────────────────────
    if (proposal.specialRequests) {
      doc.moveDown(1.5);
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#111").text("Special Requests");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor("#555").text(proposal.specialRequests);
    }

    // ─── Footer ────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor("#ddd").lineWidth(1).stroke();
    doc.moveDown(0.5);

    doc.fontSize(9).font("Helvetica-Oblique").fillColor("#999")
      .text(
        `This quote was prepared by ${config.businessName}. Pricing is valid for 30 days from the date of issue. ` +
        `To accept, visit your personalized quote link or contact us directly.`,
        { align: "center" }
      );
    doc.moveDown(0.3);
    doc.text(`${config.phone} · ${config.email}`, { align: "center" });

    doc.end();
  });
}
