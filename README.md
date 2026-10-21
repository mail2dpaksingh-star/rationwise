# RationWise v2.4 — International Launch Candidate (2026-10-20)

**Actual status: Built and locally unit-tested, NOT deployed or connected to real merchant/database accounts.** The software is a public-beta animal-feed formulation and cost-optimization *tool*, not independently nutritionist-certified feeding instructions.

## v2.2 → v2.4 implementation

- **v2.2 account implementation:** Supabase email/password sign-up, verified-email sign-in, reset password, authenticated user dashboard, server-side token verification, private farm profile and formulation JSON save/download/delete, owner-scoped records and PostgreSQL RLS.
- **v2.3 subscription implementation:** Four allowlisted Stripe price tiers, server-created Checkout sessions, customer portal, Stripe webhook HMAC verification, event de-duplication, reconciliation against Stripe's current subscription state, server-side quotas. Payment credentials never appear in frontend files.
- **v2.4 international launch candidate:** Country/region/currency and breed profiles retained from v2.1; subscription planning in USD with explicit regional billing/tax limitations; security headers, deployment instructions, draft privacy/terms, beta scientific warnings, Cloudflare Pages Functions server. **International legal, tax, science and account deletion review remain open.**

## Run legacy calculator locally

Open `dist/index.html` in a browser. All v2.1 feed optimizers are still included. The cloud account controls will show a configuration warning, because they require the Pages Functions server and real Supabase project. No payment can take place when Stripe is unconfigured.

## Deployment procedure (owner action required)

**CRITICAL:** Unlike v2.1, do NOT drag and drop only `dist/` or its ZIP in the Cloudflare dashboard and expect subscriptions to work. This package includes `/functions/api/[[path]].js`, which Cloudflare must compile. Deploy from Git or `wrangler pages deploy dist` from the PROJECT ROOT. The Cloudflare dashboard's ZIP drag-and-drop upload does not compile a Functions folder. [Cloudflare instructions](https://developers.cloudflare.com/pages/get-started/direct-upload/).

1. Obtain Cloudflare Pages access and a real HTTPS URL or a Pages project with a custom domain. Create a Pages project (e.g. `rationwise`) if none exists.
2. Create a Supabase project in an appropriate region and review data residency. In Supabase SQL Editor run `backend/migrations/0001_saas_foundation.sql`, followed by `backend/migrations/0002_launch_account_security.sql`. Never run migrations on a production database without review/backup.
3. In Supabase Authentication enable email confirmation and configure Site URL and redirect URLs to exactly your deployed HTTPS origin, including recovery links; configure custom SMTP for dependable verification emails. Review the Supabase Security Advisor and test RLS with TWO independent users.
4. In Cloudflare Pages > Settings > Variables and Secrets, add **production** environment settings listed below. Mark secrets as encrypted. **Never paste secrets into site files, into Git, or into this chat.**
5. From extracted project root run `npx wrangler login`, `npx wrangler pages project create` (first time), then `npx wrangler pages deploy dist --project-name <YOUR_PROJECT>`. Alternatively connect a Git repository as the Pages source and set output folder `dist`, root the project directory and keep `/functions/` alongside it.
6. Test account sign-up, verification, login, save/delete, two-user isolation, quota, logout and password recovery on the deployed HTTPS URL.
7. Configure Stripe **test mode** merchant account, prices and webhook endpoint, then test checkout, portal, renewals, cancellations and webhook replay. Only after an owner-led security, tax, privacy and qualified scientific review should you authorize live payments. Deploy again after adding environment variables if necessary.

### Cloudflare public variables (not secret)

- `SUPABASE_URL=https://<your-project>.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key, not a service-role key>`
- `SITE_URL=https://<your-actual-domain>` (must equal the intended checkout origin)
- `BILLING_ENABLED=false` initially. Set to `true` only while actively testing checkout.
- `STRIPE_PRICE_FARMER_MONTHLY=<price_...>`
- `STRIPE_PRICE_FARMER_ANNUAL=<price_...>`
- `STRIPE_PRICE_PRO_MONTHLY=<price_...>`
- `STRIPE_PRICE_FEEDMILL_MONTHLY=<price_...>`

### Cloudflare encrypted secrets (NEVER in frontend, Git, or chat)

- `SUPABASE_SERVICE_ROLE_KEY` (server side only)
- `STRIPE_SECRET_KEY` (begin with `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` (`whsec_...` obtained after defining your endpoint)
- `ENABLE_LIVE_BILLING` must NOT be `true` during test mode. Even with live Stripe keys and `BILLING_ENABLED=true`, API checkout rejects real payments until **explicitly** set to `true` after review.

### Stripe webhook

Endpoint: `https://<your-domain>/api/webhooks/stripe`
Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Enable the Stripe Billing customer portal with cancellation and payment-method updates. Subscription tiers MUST match the server-side Stripe Price IDs; do not rely on website-displayed labels for actual billing totals.

### Check API configuration

- `GET /api/config` exposes **only** public keys and readiness indicators.
- `GET /api/me` requires a verified Supabase bearer token.
- `POST /api/checkout` requires verified account + allowlisted plan. Browser cannot choose Stripe price IDs.
- `POST /api/webhooks/stripe` requires a valid Stripe HMAC signature.
- `/api/saves?kind=farm` and `?kind=formulation` enforce ownership and plan quotas on server.

## Testing already performed

- `npm test`: existing legacy calculation/regression tests + v2.4 API mocked dependency tests.
- `npm run build`: copy scientific modules, hash/check distributable files.
- JS syntax checks for account24 and api-core.
- **Not performed:** live Supabase/Stripe integration, Cloudflare production deployment, payment/tax transactions, independent security audit, browser cross-device acceptance in this environment (the available Chromium session blocks navigation under administrator policy), scientific nutritionist validation.

## Development safety rules

All nutrient targets and formulations remain user-supplied or limited sourced previews; no breed- or stage-specific feeding adequacy is guaranteed. Optimizer tests establish software mathematics, **not** animal welfare, diet safety, legal feed composition, or commercial licensing.

`dist/privacy.html` and `dist/terms.html` are DRAFTS requiring owner information and local counsel before any customer launch. No account-wide self-service deletion or legal records-retention policy is implemented. The current backend is suitable for further beta and real-account integration testing, not independently audited production payment operations.

*Prior v2.1 complete ZIP is preserved under `/archive/RationWise_v2.1_UNMODIFIED.zip`.*
