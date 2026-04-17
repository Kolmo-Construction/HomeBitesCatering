// Square payments wrapper. Mirrors the graceful-skip pattern of email.ts /
// smsService.ts — if SQUARE_ACCESS_TOKEN is unset, payment calls return a
// skipped result instead of throwing, so the tasting flow still works (booked
// without collecting payment) and Mike can collect manually.
//
// Used by P1-1 (tasting checkout). Structured to be reusable by P2-2 (event
// deposit + balance checkout) without changes.

import { SquareClient, SquareEnvironment, WebhooksHelper } from "square";
import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import { getSquareConfig } from "../utils/siteConfig";

export interface CreateCheckoutLinkArgs {
  amountCents: number;
  name: string; // Shown in Square hosted checkout
  note?: string;
  redirectUrl: string; // Where the customer returns after paying
  referenceId?: string; // Our internal id (e.g. `tasting-${id}`) — echoed back in webhook
  email?: string | null;
  phone?: string | null;
  idempotencyKey?: string;
}

export interface CheckoutLinkResult {
  created: boolean;
  skipped: boolean;
  error?: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string;
  orderId?: string;
}

// Lazy Square client singleton
let squareClient: SquareClient | null = null;
function getSquareClient(): SquareClient | null {
  const cfg = getSquareConfig();
  if (!cfg.accessToken) return null;
  if (!squareClient) {
    squareClient = new SquareClient({
      token: cfg.accessToken,
      environment:
        cfg.environment === "production"
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
    });
  }
  return squareClient;
}

export async function createCheckoutLink(
  args: CreateCheckoutLinkArgs,
): Promise<CheckoutLinkResult> {
  const cfg = getSquareConfig();
  if (!cfg.accessToken || !cfg.locationId) {
    console.log(
      `[square] skipped checkout for ${args.referenceId ?? args.name} — SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID not set`,
    );
    return { created: false, skipped: true };
  }

  const client = getSquareClient();
  if (!client) return { created: false, skipped: true };

  const idempotencyKey =
    args.idempotencyKey ?? `hb-${args.referenceId ?? "x"}-${randomBytes(6).toString("hex")}`;

  try {
    const response = await client.checkout.paymentLinks.create({
      idempotencyKey,
      quickPay: {
        name: args.name,
        priceMoney: {
          amount: BigInt(args.amountCents),
          currency: "USD",
        },
        locationId: cfg.locationId,
      },
      checkoutOptions: {
        redirectUrl: args.redirectUrl,
        askForShippingAddress: false,
      },
      paymentNote: args.note,
      prePopulatedData: {
        buyerEmail: args.email ?? undefined,
        buyerPhoneNumber: args.phone ?? undefined,
      },
    });

    const link = response.paymentLink;
    if (!link) {
      return { created: false, skipped: false, error: "Square returned no paymentLink" };
    }

    return {
      created: true,
      skipped: false,
      paymentLinkId: link.id ?? undefined,
      paymentLinkUrl: link.url ?? undefined,
      orderId: link.orderId ?? undefined,
    };
  } catch (error: any) {
    // Square SDK errors have an `errors` array on them
    const msg =
      error?.errors?.map((e: any) => e.detail).join("; ") ||
      error?.message ||
      String(error);
    console.error(`[square] createCheckoutLink failed:`, msg);
    return { created: false, skipped: false, error: msg };
  }
}

/**
 * Verify a Square webhook signature.
 * Square posts `x-square-hmacsha256-signature` containing a base64-encoded
 * HMAC-SHA256 of `notificationUrl + rawBody` signed with the webhook signature key.
 * If SQUARE_WEBHOOK_SIGNATURE_KEY is unset, we accept for local dev and log loudly.
 */
export function verifySquareWebhook(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
): boolean {
  const cfg = getSquareConfig();
  if (!cfg.webhookSignatureKey) {
    console.warn(
      "[square] webhook received but SQUARE_WEBHOOK_SIGNATURE_KEY is unset — accepting (INSECURE, dev only)",
    );
    return true;
  }
  if (!signatureHeader) return false;

  try {
    // Prefer the SDK helper when available; fall back to manual HMAC to avoid
    // version-drift surprises.
    const bodyString = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    try {
      // SDK helper — available on v44+
      const ok = (WebhooksHelper as any).verifySignature?.({
        requestBody: bodyString,
        signatureHeader,
        signatureKey: cfg.webhookSignatureKey,
        notificationUrl: cfg.webhookNotificationUrl,
      });
      if (typeof ok === "boolean") return ok;
    } catch {
      // fall through to manual
    }
    const expected = createHmac("sha256", cfg.webhookSignatureKey)
      .update(cfg.webhookNotificationUrl + bodyString)
      .digest("base64");
    if (signatureHeader.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch (err) {
    console.error("[square] signature verification error:", err);
    return false;
  }
}
