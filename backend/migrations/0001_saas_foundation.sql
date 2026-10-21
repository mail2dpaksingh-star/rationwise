-- RationWise v2.2+ design migration: NOT APPLIED to a database.
-- Requires Supabase PostgreSQL with auth.users and auth.uid().
-- Must be independently security reviewed and integration-tested before launch.
begin;
create extension if not exists pgcrypto;

create table if not exists public.rw_account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name)<=120),
  country_code text check(country_code ~ '^[A-Z]{2}$'),
  currency_code text check(currency_code ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.rw_farm_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_json jsonb not null check(jsonb_typeof(profile_json)='object'),
  version integer not null default 1 check(version>=1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rw_farm_profiles_user_id_idx on public.rw_farm_profiles(user_id);
create table if not exists public.rw_formulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  farm_profile_id uuid,
  formulation_json jsonb not null check(jsonb_typeof(formulation_json)='object'),
  scientific_release_status text not null default 'not_certified' check(scientific_release_status='not_certified'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rw_formulations_owner_idx on public.rw_formulations(user_id);
create table if not exists public.rw_billing_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  price_id text,
  subscription_status text not null default 'none'
    check(subscription_status in ('none','trialing','active','past_due','canceled','unpaid','paused','incomplete','incomplete_expired')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.rw_billing_events (
  event_id text primary key,
  event_type text not null,
  created_at timestamptz not null default now()
);

alter table public.rw_account_profiles enable row level security;
alter table public.rw_farm_profiles enable row level security;
alter table public.rw_formulations enable row level security;
alter table public.rw_billing_subscriptions enable row level security;
alter table public.rw_billing_events enable row level security;

create policy rw_account_self_select on public.rw_account_profiles
  for select to authenticated using(auth.uid()=user_id);
create policy rw_account_self_insert on public.rw_account_profiles
  for insert to authenticated with check(auth.uid()=user_id);
create policy rw_account_self_update on public.rw_account_profiles
  for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

create policy rw_farm_owner_select on public.rw_farm_profiles
  for select to authenticated using(auth.uid()=user_id);
create policy rw_farm_owner_insert on public.rw_farm_profiles
  for insert to authenticated with check(auth.uid()=user_id);
create policy rw_farm_owner_update on public.rw_farm_profiles
  for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy rw_farm_owner_delete on public.rw_farm_profiles
  for delete to authenticated using(auth.uid()=user_id);

create policy rw_formulation_owner_select on public.rw_formulations
  for select to authenticated using(auth.uid()=user_id);
create policy rw_formulation_owner_insert on public.rw_formulations
  for insert to authenticated with check(auth.uid()=user_id);
create policy rw_formulation_owner_update on public.rw_formulations
  for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy rw_formulation_owner_delete on public.rw_formulations
  for delete to authenticated using(auth.uid()=user_id);

-- Subscription rows are readable ONLY by their owner. No client insert/update/delete policies.
-- Stripe webhook must verify signatures server-side and use dedicated service-role credentials.
create policy rw_billing_owner_read on public.rw_billing_subscriptions
  for select to authenticated using(auth.uid()=user_id);
-- Billing event records have NO client policies: service-only idempotent webhook processing.

-- These restrictions help enforce user ownership even when a guessed UUID is supplied.
-- The application must additionally ensure farm_profile_id belongs to the same user.
commit;
