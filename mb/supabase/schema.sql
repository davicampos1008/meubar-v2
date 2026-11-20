-- Meu Bar — esquema COMPLETO. Pode rodar de novo quantas vezes quiser (não apaga dados).
-- Supabase → SQL Editor → New query → cole tudo → Run.
create extension if not exists unaccent with schema extensions;

create table if not exists bars (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind text not null default 'home' check (kind in ('home','counter','tables')),
  accepting_orders boolean not null default true,
  shakers int[] not null default '{750,500}',
  created_at timestamptz default now()
);
alter table bars add column if not exists tiers int[];

create table if not exists bar_items (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  category text not null, name text not null,
  in_stock boolean not null default true, created_at timestamptz default now()
);
alter table bar_items add column if not exists brand text;
alter table bar_items add column if not exists variant text;
alter table bar_items add column if not exists size_ml int;
alter table bar_items add column if not exists level text;
alter table bar_items add column if not exists qty int;

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  owner uuid default auth.uid() references auth.users on delete set null,
  name text not null, category text not null default 'Refrescantes',
  ingredients jsonb not null default '[]', steps text not null default '', story text, image_url text,
  shaken boolean not null default true,
  author_nick text not null default 'Meu Bar', is_public boolean not null default true,
  created_at timestamptz default now()
);
alter table recipes add column if not exists description text;
alter table recipes add column if not exists glass text;
alter table recipes add column if not exists technique text;
alter table recipes add column if not exists garnish text;
alter table recipes add column if not exists tags text[];
alter table recipes add column if not exists sources jsonb;
alter table recipes add column if not exists verified boolean not null default false;

create table if not exists bar_prices (
  bar_id uuid references bars on delete cascade, recipe_id uuid references recipes on delete cascade,
  price numeric(8,2) not null, primary key (bar_id, recipe_id)
);
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  recipe_id uuid not null references recipes on delete cascade,
  client_name text not null, qty int not null default 1, note text, price numeric(8,2),
  status text not null default 'pending' check (status in ('pending','ready','done')),
  paid boolean not null default false,
  created_at timestamptz default now(), ready_at timestamptz
);
create index if not exists orders_bar_created on orders (bar_id, created_at desc);
create table if not exists admins (user_id uuid primary key references auth.users on delete cascade);

alter table bars enable row level security; alter table bar_items enable row level security;
alter table recipes enable row level security; alter table bar_prices enable row level security;
alter table orders enable row level security; alter table admins enable row level security;

-- Cada pessoa só enxerga e mexe no que é dela
drop policy if exists "bars" on bars;
create policy "bars" on bars for all using (owner=auth.uid()) with check (owner=auth.uid());
drop policy if exists "itens" on bar_items;
create policy "itens" on bar_items for all using (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid())) with check (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid()));
drop policy if exists "precos" on bar_prices;
create policy "precos" on bar_prices for all using (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid())) with check (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid()));
drop policy if exists "pedidos" on orders;
create policy "pedidos" on orders for all using (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid())) with check (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid()));
drop policy if exists "admin ve o proprio" on admins;
create policy "admin ve o proprio" on admins for select using (user_id=auth.uid());
drop policy if exists "receitas ler" on recipes;
create policy "receitas ler" on recipes for select using (is_public or owner=auth.uid());
drop policy if exists "receitas criar" on recipes;
create policy "receitas criar" on recipes for insert with check (owner=auth.uid());
drop policy if exists "receitas editar" on recipes;
create policy "receitas editar" on recipes for update using (owner=auth.uid() or exists(select 1 from admins a where a.user_id=auth.uid()));
drop policy if exists "receitas apagar" on recipes;
create policy "receitas apagar" on recipes for delete using (owner=auth.uid());

-- Fotos das receitas
insert into storage.buckets (id,name,public) values ('recipes','recipes',true) on conflict do nothing;
drop policy if exists "fotos ver" on storage.objects;
create policy "fotos ver" on storage.objects for select using (bucket_id='recipes');
drop policy if exists "fotos enviar" on storage.objects;
create policy "fotos enviar" on storage.objects for insert to authenticated with check (bucket_id='recipes');

-- Funções públicas para o cliente do QR (sem login)
create or replace function get_menu(p_bar uuid) returns json language sql security definer set search_path=public,extensions as $$
select json_build_object(
 'bar', json_build_object('name',b.name,'kind',b.kind,'open',b.accepting_orders),
 'items', coalesce((select json_agg(json_build_object('id',r.id,'name',r.name,'category',r.category,'image_url',r.image_url,'price',p.price,'ingredients',r.ingredients) order by r.name)
   from recipes r left join bar_prices p on p.bar_id=b.id and p.recipe_id=r.id
   where r.is_public and (b.kind='home' or p.price is not null)
   and not exists (select 1 from jsonb_array_elements(r.ingredients) i
     where lower(unaccent(i->>'n')) not in ('gelo','agua','agua gelada')
     and not exists (select 1 from bar_items bi where bi.bar_id=b.id and bi.in_stock and lower(unaccent(bi.name))=lower(unaccent(i->>'n')))
   )),'[]'::json))
from bars b where b.id=p_bar $$;
create or replace function place_order(p_bar uuid,p_name text,p_recipe uuid,p_qty int,p_note text) returns uuid
language plpgsql security definer set search_path=public,extensions as $$
declare b bars; pr numeric; oid uuid;
begin
 select * into b from bars where id=p_bar;
 if b.id is null then raise exception 'Bar não encontrado'; end if;
 if not b.accepting_orders then raise exception 'Pedidos pausados no momento'; end if;
 if length(trim(coalesce(p_name,'')))<2 then raise exception 'Informe seu nome'; end if;
 if p_qty<1 or p_qty>5 then raise exception 'Quantidade inválida'; end if;
 select price into pr from bar_prices where bar_id=p_bar and recipe_id=p_recipe;
 if b.kind<>'home' and pr is null then raise exception 'Drink indisponível'; end if;
 insert into orders(bar_id,recipe_id,client_name,qty,note,price) values(p_bar,p_recipe,left(trim(p_name),40),p_qty,left(p_note,140),pr) returning id into oid;
 return oid;
end $$;
create or replace function order_status(p_ids uuid[]) returns table(id uuid,status text) language sql security definer set search_path=public as $$
select o.id,o.status from orders o where o.id = any(p_ids) $$;
grant execute on function get_menu(uuid), place_order(uuid,text,uuid,int,text), order_status(uuid[]) to anon, authenticated;

-- Pedidos em tempo real (ignora se já estiver ligado)
do $$ begin
  alter publication supabase_realtime add table orders;
exception when others then null;
end $$;
