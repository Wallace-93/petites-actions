-- =====================================================================
--  Petites Actions — Pack de durcissement avant la bêta
--
--  À exécuter dans Supabase > SQL Editor, section par section, dans
--  l'ordre. Chaque bloc est indépendant et relançable sans dommage.
--
--  Prérequis : la migration migration-trading-lab.sql doit avoir été
--  exécutée avant celle-ci.
-- =====================================================================


-- =====================================================================
--  1. AUDIT : QUI PEUT LIRE QUOI ?          ← à lancer en premier, seul
-- =====================================================================
-- La clé anon est publique : elle est lisible dans le code source de
-- chaque page. Tout ce qui n'est pas protégé par une politique RLS est
-- donc lisible par n'importe qui. Ce SELECT liste les tables non
-- protégées : idéalement, il ne renvoie aucune ligne.

select
  c.relname            as table_name,
  c.relrowsecurity     as rls_active,
  count(p.policyname)  as nb_politiques
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.tablename = c.relname and p.schemaname = 'public'
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity asc, nb_politiques asc;


-- =====================================================================
--  2. ACTIVATION DE RLS SUR LES TABLES DU TRADING LAB
-- =====================================================================
alter table public.trading_portfolios          enable row level security;
alter table public.trading_positions           enable row level security;
alter table public.trading_orders              enable row level security;
alter table public.trading_portfolio_snapshots enable row level security;

-- Chaque utilisateur ne voit que ses propres lignes.
do $$
declare t text;
begin
  foreach t in array array['trading_portfolios','trading_positions',
                           'trading_orders','trading_portfolio_snapshots']
  loop
    execute format('drop policy if exists "lecture_proprietaire" on public.%I', t);
    execute format(
      'create policy "lecture_proprietaire" on public.%I
         for select to authenticated using (auth.uid() = user_id)', t);
  end loop;
end $$;


-- =====================================================================
--  3. INTÉGRITÉ DES DONNÉES
-- =====================================================================
-- Toute la logique de trading s'exécute aujourd'hui dans le navigateur.
-- Ces contraintes sont le dernier rempart : elles empêchent qu'une
-- valeur incohérente atteigne la base, quelle qu'en soit l'origine.

alter table public.trading_portfolios
  drop constraint if exists cash_positif,
  add  constraint cash_positif check (cash_balance >= 0);

alter table public.trading_portfolios
  drop constraint if exists capital_positif,
  add  constraint capital_positif check (initial_capital > 0);

alter table public.trading_positions
  drop constraint if exists quantite_positive,
  add  constraint quantite_positive check (quantity >= 0);

alter table public.trading_positions
  drop constraint if exists pru_positif,
  add  constraint pru_positif check (avg_buy_price > 0);

alter table public.trading_orders
  drop constraint if exists ordre_coherent,
  add  constraint ordre_coherent check (
    quantity > 0 and price > 0 and side in ('buy','sell')
  );


-- =====================================================================
--  4. INDEX
-- =====================================================================
-- Les deux requêtes les plus fréquentes du Trading Lab : le dernier
-- historique d'ordres et la série d'instantanés.

create index if not exists idx_orders_user_date
  on public.trading_orders (user_id, created_at desc);

create index if not exists idx_snapshots_user_date
  on public.trading_portfolio_snapshots (user_id, created_at asc);

create index if not exists idx_positions_user
  on public.trading_positions (user_id);


-- =====================================================================
--  5. EXÉCUTION DES ORDRES CÔTÉ SERVEUR
-- =====================================================================
-- Aujourd'hui le navigateur calcule le solde puis l'écrit. Avec la clé
-- anon, un utilisateur curieux peut donc s'attribuer le solde de son
-- choix. Cette fonction déplace le calcul dans la base : le client ne
-- transmet plus que l'intention (actif, sens, quantité, prix).
--
-- Une fois cette fonction en place et le front adapté, il faut RETIRER
-- les droits d'écriture directs (section 6).

create or replace function public.passer_ordre(
  p_asset_id     text,
  p_asset_symbol text,
  p_side         text,
  p_quantity     numeric,
  p_price        numeric
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_total       numeric;
  v_frais       numeric;
  v_cash        numeric;
  v_qty         numeric := 0;
  v_pru         numeric := 0;
  v_pnl         numeric := null;
  v_taux_frais  constant numeric := 0.001;  -- 0,1 %, visible et pédagogique
begin
  if v_user is null then
    raise exception 'Authentification requise';
  end if;
  if p_quantity <= 0 or p_price <= 0 then
    raise exception 'Quantité ou prix invalide';
  end if;
  if p_side not in ('buy','sell') then
    raise exception 'Sens d''ordre invalide';
  end if;

  v_total := p_quantity * p_price;
  v_frais := round(v_total * v_taux_frais, 8);

  select cash_balance into v_cash
  from trading_portfolios where user_id = v_user for update;

  if not found then
    raise exception 'Portefeuille introuvable';
  end if;

  select quantity, avg_buy_price into v_qty, v_pru
  from trading_positions where user_id = v_user and asset_id = p_asset_id;

  if p_side = 'buy' then
    if v_cash < v_total + v_frais then
      raise exception 'Fonds insuffisants';
    end if;

    update trading_portfolios
      set cash_balance = cash_balance - v_total - v_frais
      where user_id = v_user;

    insert into trading_positions (user_id, asset_id, asset_symbol, quantity, avg_buy_price)
    values (v_user, p_asset_id, p_asset_symbol, p_quantity, p_price)
    on conflict (user_id, asset_id) do update
      set quantity      = trading_positions.quantity + excluded.quantity,
          avg_buy_price = ((trading_positions.quantity * trading_positions.avg_buy_price)
                            + (excluded.quantity * excluded.avg_buy_price))
                          / (trading_positions.quantity + excluded.quantity);
  else
    if coalesce(v_qty, 0) < p_quantity then
      raise exception 'Quantité détenue insuffisante';
    end if;

    v_pnl := (p_price - v_pru) * p_quantity - v_frais;

    update trading_portfolios
      set cash_balance = cash_balance + v_total - v_frais
      where user_id = v_user;

    if v_qty - p_quantity <= 0.0000000001 then
      delete from trading_positions where user_id = v_user and asset_id = p_asset_id;
    else
      update trading_positions
        set quantity = quantity - p_quantity
        where user_id = v_user and asset_id = p_asset_id;
    end if;
  end if;

  insert into trading_orders
    (user_id, asset_id, asset_symbol, side, quantity, price, total, realized_pnl)
  values
    (v_user, p_asset_id, p_asset_symbol, p_side, p_quantity, p_price, v_total, v_pnl);

  select cash_balance into v_cash from trading_portfolios where user_id = v_user;
  return json_build_object('cash_balance', v_cash, 'frais', v_frais, 'realized_pnl', v_pnl);
end $$;

revoke all on function public.passer_ordre(text,text,text,numeric,numeric) from public;
grant execute on function public.passer_ordre(text,text,text,numeric,numeric) to authenticated;


-- =====================================================================
--  6. FERMETURE DES ÉCRITURES DIRECTES
-- =====================================================================
--  /!\  À N'EXÉCUTER QU'APRÈS avoir modifié trading-lab.html pour qu'il
--       appelle sb.rpc('passer_ordre', ...) au lieu d'écrire lui-même.
--       Exécutée trop tôt, cette section casse le Trading Lab.
--
-- revoke insert, update, delete on public.trading_portfolios  from authenticated;
-- revoke insert, update, delete on public.trading_positions   from authenticated;
-- revoke insert, update, delete on public.trading_orders      from authenticated;


-- =====================================================================
--  7. RÉINITIALISATION DU PORTEFEUILLE
-- =====================================================================
-- Un bêta-testeur qui a tout perdu en trois jours abandonne le lab.
-- Cette fonction lui rend un portefeuille neuf sans effacer son
-- historique d'ordres, qui reste la matière pédagogique.

create or replace function public.reinitialiser_portefeuille()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentification requise';
  end if;

  delete from trading_positions where user_id = v_user;
  delete from trading_portfolio_snapshots where user_id = v_user;

  update trading_portfolios
    set cash_balance = initial_capital
    where user_id = v_user;
end $$;

revoke all on function public.reinitialiser_portefeuille() from public;
grant execute on function public.reinitialiser_portefeuille() to authenticated;


-- =====================================================================
--  8. INSTANTANÉS QUOTIDIENS AUTOMATIQUES
-- =====================================================================
-- Aujourd'hui un instantané n'est pris que si l'utilisateur ouvre la
-- page. Quelqu'un qui revient au bout de dix jours n'a donc aucune
-- courbe. Cette table de cours partagés, alimentée une seule fois pour
-- tous, sert à la fois au calcul quotidien et à soulager l'API.

create table if not exists public.market_prices (
  asset_id    text primary key,
  price       numeric not null check (price > 0),
  change_24h  numeric,
  updated_at  timestamptz not null default now()
);

alter table public.market_prices enable row level security;
drop policy if exists "lecture_publique_cours" on public.market_prices;
create policy "lecture_publique_cours" on public.market_prices
  for select to authenticated using (true);

-- Instantané quotidien de tous les portefeuilles, valorisés avec les
-- cours de market_prices. Les portefeuilles dont un actif détenu n'a
-- pas de cours sont ignorés : mieux vaut un trou dans la courbe qu'un
-- point faux.
create or replace function public.instantanes_quotidiens()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_nb integer;
begin
  with valorisation as (
    select
      p.user_id,
      p.cash_balance,
      p.cash_balance + coalesce(sum(pos.quantity * mp.price), 0) as total_value,
      bool_or(pos.asset_id is not null and mp.asset_id is null)  as cours_manquant
    from trading_portfolios p
    left join trading_positions pos on pos.user_id = p.user_id and pos.quantity > 0
    left join market_prices mp on mp.asset_id = pos.asset_id
    group by p.user_id, p.cash_balance
  )
  insert into trading_portfolio_snapshots (user_id, total_value, cash_balance)
  select user_id, total_value, cash_balance
  from valorisation
  where coalesce(cours_manquant, false) = false;

  get diagnostics v_nb = row_count;
  return v_nb;
end $$;

-- Planification (nécessite l'extension pg_cron, activable depuis
-- Supabase > Database > Extensions) : tous les jours à 22 h UTC.
-- create extension if not exists pg_cron;
-- select cron.schedule('instantanes_quotidiens', '0 22 * * *',
--                      $$select public.instantanes_quotidiens()$$);


-- =====================================================================
--  9. RETOURS DES BÊTA-TESTEURS
-- =====================================================================
create table if not exists public.retours (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  page       text,
  categorie  text check (categorie in ('bug','contenu','idee','autre')),
  message    text not null check (char_length(message) between 3 and 4000),
  created_at timestamptz not null default now()
);

alter table public.retours enable row level security;

drop policy if exists "ecriture_retour" on public.retours;
create policy "ecriture_retour" on public.retours
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "lecture_de_ses_retours" on public.retours;
create policy "lecture_de_ses_retours" on public.retours
  for select to authenticated using (auth.uid() = user_id);

create index if not exists idx_retours_date on public.retours (created_at desc);


-- =====================================================================
--  10. TABLEAU DE BORD DE LA BÊTA
-- =====================================================================
-- Requêtes à lancer à la main pendant la phase de test.

-- Activité : inscriptions et dernière connexion
-- select date_trunc('day', created_at) as jour, count(*) as inscriptions
-- from auth.users group by 1 order by 1 desc;

-- Où les gens décrochent : nombre de comptes par nombre de leçons finies
-- select nb_lecons, count(*) as comptes from (
--   select user_id, count(*) as nb_lecons
--   from progression group by user_id
-- ) t group by 1 order by 1;

-- Le chiffre pédagogique du Trading Lab : part des portefeuilles
-- en perte, une fois les frais pris en compte.
-- select
--   count(*) filter (where perf < 0) * 100.0 / nullif(count(*),0) as pct_en_perte,
--   round(avg(perf), 2) as perf_moyenne
-- from (
--   select p.user_id,
--          (p.cash_balance + coalesce(sum(pos.quantity * mp.price),0) - p.initial_capital)
--          / p.initial_capital * 100 as perf
--   from trading_portfolios p
--   left join trading_positions pos on pos.user_id = p.user_id and pos.quantity > 0
--   left join market_prices mp on mp.asset_id = pos.asset_id
--   group by p.user_id, p.cash_balance, p.initial_capital
-- ) t;
