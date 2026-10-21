# RationWise international launch checklist

## Public beta readiness
- [x] Preserve v2.1 code and existing 37-stage optimizer.
- [x] Source-controlled server architecture for accounts and subscriptions.
- [x] Unit/contract tests of authorization, quotas, plan selection and webhook verification.
- [ ] Finish live browser smoke tests on desktop/mobile; restricted browser here prevented run.
- [ ] Create Cloudflare Pages project and publish the v2.4 package through Git or Wrangler.
- [ ] Verify live HTTPS URL, headers and public assets.
- [ ] Fill legal operator identity, support address, privacy/terms and account deletion request channel.

## Account activation
- [ ] Create and secure production Supabase project.
- [ ] Run and independently review both SQL migrations; use Supabase Security Advisor.
- [ ] Configure verified emails, SMTP, redirect domains, MFA/abuse policies and privacy region.
- [ ] Test real accounts A and B cannot see each other's records; test API rate limiting and quotas.
- [ ] Configure backups, incident response, data deletion and breach process.

## Stripe test subscriptions
- [ ] Verify merchant/account country and cross-border customer eligibility.
- [ ] Create all four Stripe subscription products/prices matching the UI labels.
- [ ] Configure test webhook secret; test events, replay, cancellation and failed payment.
- [ ] Configure Billing Portal, cancellation confirmation, invoice emails, tax/refund behavior.
- [ ] Run test purchases end-to-end with test cards only.

## Live commercial launch (not authorized by software tests)
- [ ] Independent animal nutritionists review species-specific requirements, feed-safety gates and ingredient data licensing.
- [ ] Regional feed laws and claims review by qualified counsel.
- [ ] Privacy / consumer protection / taxes / payment requirements for intended markets.
- [ ] Independent security review, malicious-input checks, backup restoration, abuse testing and monitoring.
- [ ] Owner explicitly approves ENABLE_LIVE_BILLING=true with live merchant credentials.
- [ ] Cross-device customer acceptance tests and public support process.
