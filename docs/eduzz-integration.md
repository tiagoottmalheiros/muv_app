# Eduzz Checkout - MUV Starter

## Active checkout

The application uses Eduzz as the active payment provider. Set:

```text
PAYMENT_PROVIDER=eduzz
NEXT_PUBLIC_EDUZZ_CHECKOUT_URL=https://...
```

All purchase buttons point to `/checkout`, which redirects to the configured Eduzz offer. Keeping this internal route means the provider URL can change without editing every call to action.

## Access automation

Checkout redirection does not grant access by itself. Until the official Eduzz webhook is implemented, an administrator must activate the buyer in `/admin` after confirming payment.

The future webhook must:

1. Verify the official Eduzz signature before parsing the event.
2. Store the external purchase ID and normalized purchase email.
3. Activate `muv_starter` only after a confirmed payment.
4. Block access after cancellation, refund, or chargeback.
5. Process duplicate and out-of-order events idempotently.
6. Record an audit event without storing the full webhook payload.

Do not invent the webhook payload or signature algorithm. Implement them from the current official Eduzz documentation when credentials are available.
