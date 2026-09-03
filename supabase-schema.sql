create extension if not exists pgcrypto;

create table if not exists public.orinaya_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 3 and 900),
  name text,
  anonymous boolean not null default true,
  status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

alter table public.orinaya_messages enable row level security;

/* Web nepřistupuje do tabulky přímo.
   Veškerý přístup jde přes Vercel API se service-role klíčem. */
