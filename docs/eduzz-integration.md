# Eduzz Checkout - MUV Starter

## Active checkout

The application uses Eduzz as the active payment provider. Set:

```text
PAYMENT_PROVIDER=eduzz
NEXT_PUBLIC_EDUZZ_CHECKOUT_URL=https://...
```

All purchase buttons point to `/checkout`. The application creates an individual Sun cart through the Eduzz API with a unique order ID, a browser return token, and a separate postback token. Configure `EDUZZ_ACCESS_TOKEN` with the personal access token generated from the application's actions menu, as required by Eduzz support for this endpoint. The application must have `sun_cart_write` and `myeduzz_sales_read` scopes.

Set `EDUZZ_SUN_CHECKOUT_ENABLED=true` only after the OAuth application is created under the same Eduzz producer account as product `2999407`. Until then, `/checkout` keeps redirecting to `NEXT_PUBLIC_EDUZZ_CHECKOUT_URL`.

Configure the Eduzz buyer-facing thank-you redirect as:

```text
https://www.appmuv.com/obrigado
```

The cart return URL points to `/ativar` with an opaque token whose SHA-256 hash is stored in the database. A different, unguessable token protects the cart postback. The postback sale ID is checked against the Eduzz API for paid status, product `2999407`, BRL currency, and the expected R$ 29,90 total before the browser token can expose a one-time Clerk invitation URL. Clerk sign-up is restricted, so opening `/sign-up` without a valid invitation cannot create an account.

`/obrigado` remains the fallback for old/static checkout links and instructs the buyer to open the secure invitation sent automatically to the purchase email.

## Access automation

Eduzz sends signed events to `POST /api/webhooks/eduzz`. The endpoint validates `x-signature` as an HMAC SHA-256 of the raw request body before parsing the payload.

The active subscription filters product `2999407` and receives:

- `myeduzz.invoice_paid`
- `myeduzz.invoice_refunded`
- `myeduzz.invoice_canceled`
- `myeduzz.invoice_chargeback`

An approved purchase creates an active `muv_starter` entitlement for the normalized purchase email. If no Clerk user or pending invitation exists, the buyer receives a 30-day invitation to create an account. On first login with the purchase email, the entitlement is claimed atomically by the Clerk profile.

Refunds, cancellations, and chargebacks update the same entitlement. Event IDs are idempotent and timestamps prevent an older delivery from reverting a newer status. Only audit metadata is retained; the full webhook payload is not stored.

Manual activation in `/admin` remains available as an operational fallback. It creates a pending entitlement and sends the same secure invitation instead of assigning a temporary password.

## Custom delivery

The product can use Eduzz's `Customizado` delivery instead of a downloadable instruction file. Configure it with:

```text
https://your-domain.example/api/eduzz/custom-delivery
```

The endpoint accepts Eduzz's `create` and `remove` operations, validates `fields.edz_cli_origin_secret` against `EDUZZ_ORIGIN_KEY`, filters `EDUZZ_PRODUCT_ID`, and converges on the same idempotent entitlement flow used by signed webhooks. It accepts JSON, URL-encoded forms, and multipart forms because the legacy custom-delivery specification does not guarantee one content type.

The URL validation probe returns `200` without changing access. An actual delivery only succeeds after the Origin Key, invoice, product, and operation are validated. Do not configure `/entrar` as the custom-delivery URL; that is a buyer-facing page and does not process purchase data.

The signed webhook remains the payment source of truth. Custom delivery is a compatible product-delivery channel and operational fallback. `/obrigado` is the buyer-facing redirect and does not process purchase data.
