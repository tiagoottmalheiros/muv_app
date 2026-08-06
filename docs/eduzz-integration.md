# Eduzz Checkout - MUV Starter

## Active checkout

The application uses Eduzz as the active payment provider. Set:

```text
PAYMENT_PROVIDER=eduzz
NEXT_PUBLIC_EDUZZ_CHECKOUT_URL=https://...
```

All purchase buttons point to `/checkout`, which redirects to the configured Eduzz offer. Keeping this internal route means the provider URL can change without editing every call to action.

## Access automation

Eduzz sends signed events to `POST /api/webhooks/eduzz`. The endpoint validates `x-signature` as an HMAC SHA-256 of the raw request body before parsing the payload.

The active subscription filters product `2999407` and receives:

- `myeduzz.invoice_paid`
- `myeduzz.invoice_refunded`
- `myeduzz.invoice_canceled`
- `myeduzz.invoice_chargeback`

An approved purchase creates an active `muv_starter` entitlement for the normalized purchase email. If no Clerk user or pending invitation exists, the buyer receives a 30-day invitation to create an account. On first login with the purchase email, the entitlement is claimed atomically by the Clerk profile.

Refunds, cancellations, and chargebacks update the same entitlement. Event IDs are idempotent and timestamps prevent an older delivery from reverting a newer status. Only audit metadata is retained; the full webhook payload is not stored.

Manual activation in `/admin` remains available as an operational fallback.
