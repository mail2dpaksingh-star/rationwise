-- Run AFTER 0001_saas_foundation.sql in the Supabase SQL editor.
-- Server-side endpoint controls quotas and all writes. This is NOT a claim of production security review.
begin;
alter table public.rw_billing_subscriptions
 add column if not exists plan text check (plan in ('farmer_monthly','farmer_annual','professional_monthly','feedmill_monthly'));
-- Ensure every saved formulation has its own owner; profiles cannot be borrowed across tenants.
-- The v2.4 API intentionally does not set farm_profile_id; records store their own stage reference.
-- RLS on all account, farm, formulation and billing tables is enabled in 0001.
alter table public.rw_account_profiles enable row level security;
alter table public.rw_farm_profiles enable row level security;
alter table public.rw_formulations enable row level security;
alter table public.rw_billing_subscriptions enable row level security;
alter table public.rw_billing_events enable row level security;
-- Do not allow untrusted browser clients to write or delete saved records or billing status.
-- Save/delete go through /api/saves, which validates the Supabase token and server quotas.
revoke all on public.rw_farm_profiles from anon, authenticated;
revoke all on public.rw_formulations from anon, authenticated;
revoke all on public.rw_billing_subscriptions from anon, authenticated;
revoke all on public.rw_billing_events from anon, authenticated;
grant select on public.rw_farm_profiles to authenticated;
grant select on public.rw_formulations to authenticated;
grant select on public.rw_billing_subscriptions to authenticated;
-- No user-facing grants to rw_billing_events.
-- Production best practice: review all default schema privileges with the Supabase security advisor.
commit;
