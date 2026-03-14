create table profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_id text unique not null,
  role text check (role in ('client', 'freelancer')),
  name text,
  skills text[],           -- for freelancers
  portfolio_url text,
  hourly_rate numeric,
  requirements text,       -- for clients
  budget numeric,
  passport_nft_id text,    -- on-chain token ID
  wallet_address text,
  verified boolean default false,
  created_at timestamptz default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references profiles(id),
  freelancer_id uuid references profiles(id),
  terms text not null,
  amount numeric,
  status text default 'pending', -- pending | signed | completed | disputed
  escrow_contract text,          -- StarkNet contract address
  client_signed boolean default false,
  freelancer_signed boolean default false,
  created_at timestamptz default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references profiles(id),
  freelancer_id uuid references profiles(id),
  ai_score numeric,
  status text default 'pending' -- pending | accepted | rejected
);
