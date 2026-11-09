-- Cadastro de dono do AMT Dojo Manager com código de confirmação por WhatsApp
-- (Evolution API), no lugar do e-mail de confirmação.
--
-- * Guarda só o hash do código (HMAC no servidor), nunca o código.
-- * Só o servidor (service role) lê e grava: RLS ligada e sem políticas.
-- * Limites de envio por telefone, e-mail e IP são checados no servidor com
--   base nesta tabela (created_at).

create table if not exists public.dojo_signup_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,                 -- dígitos com DDI (ex.: 5511999998888)
  email text not null,                 -- minúsculo
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ip text,
  created_at timestamptz not null default now()
);

comment on table public.dojo_signup_codes is
  'Códigos de confirmação por WhatsApp do cadastro de dono do Dojo Manager. Só o servidor acessa.';

create index if not exists idx_dojo_signup_codes_phone on public.dojo_signup_codes (phone, created_at desc);
create index if not exists idx_dojo_signup_codes_email on public.dojo_signup_codes (email, created_at desc);
create index if not exists idx_dojo_signup_codes_ip on public.dojo_signup_codes (ip, created_at desc);

alter table public.dojo_signup_codes enable row level security;
revoke all on public.dojo_signup_codes from anon, authenticated;
grant all on public.dojo_signup_codes to service_role;
