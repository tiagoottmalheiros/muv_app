# Stripe Checkout - MUV Starter

## Integration plan

- Use Stripe-hosted Checkout Sessions for a one-time payment.
- Let the buyer pay before creating a Clerk account.
- Treat signed Stripe webhooks as the only source of truth for access.
- Store paid access by normalized purchase email until the buyer creates an account.
- Atomically claim the entitlement on the first login with the same email.
- Block access after a full refund or a dispute.
- Keep Stripe keys server-only and use a restricted key with minimum permissions.

## Required environment variables

```text
STRIPE_SECRET_KEY=rk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MUV_STARTER=price_...
```

Use a restricted test key during development. It needs write access to Checkout Sessions and read access to Prices, Products, Charges, PaymentIntents, and Checkout Sessions. Store production values as sensitive Vercel environment variables and never expose them with a `NEXT_PUBLIC_` prefix.

## Stripe Dashboard setup

1. Create the `MUV Starter` product and a fixed one-time BRL price.
2. Copy its `price_...` ID into `STRIPE_PRICE_MUV_STARTER`.
3. Enable the desired dynamic payment methods in the Stripe Dashboard. The application intentionally does not hardcode `payment_method_types`.
4. Create a webhook endpoint for `https://central-muv-app.vercel.app/api/webhooks/stripe`.
5. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, and `charge.dispute.created`.
6. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

## Test flow

1. Open `/checkout` and complete a test payment.
2. Confirm that the success page reports a paid session.
3. Confirm an active `entitlements` row exists with `source = stripe`, no profile, and the purchase email.
4. Create a Clerk account with the same email.
5. Confirm that the entitlement is linked to the new profile and `/central` opens.
6. Send the same webhook again and confirm there is still one entitlement for the PaymentIntent.
7. Issue a full test refund and confirm access changes to `refunded`.
8. Verify that a stale payment webhook cannot reactivate the refunded entitlement.

## Go live

- Replace all test values with live-mode restricted credentials and the live Price ID.
- Configure a separate live webhook endpoint and signing secret.
- Require strong two-factor authentication for Stripe Dashboard users.
- Review webhook delivery failures and Stripe Workbench logs.
- Run one low-value live purchase and refund before opening sales.
