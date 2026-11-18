-- Rode este arquivo inteiro num projeto Supabase NOVO: SQL Editor -> New query -> Run
create extension if not exists unaccent with schema extensions;
create table bars (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind text not null default 'home' check (kind in ('home','counter','tables')),
  accepting_orders boolean not null default true,
  shakers int[] not null default '{750,500}',   -- tamanhos das coqueteleiras (ml)
  created_at timestamptz default now()
);
create table bar_items (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  category text not null, name text not null,
  in_stock boolean not null default true, created_at timestamptz default now()
);
create table recipes (
  id uuid primary key default gen_random_uuid(),
  owner uuid default auth.uid() references auth.users on delete set null,
  name text not null, category text not null default 'Refrescantes',
  ingredients jsonb not null default '[]', steps text not null default '', story text, image_url text,
  shaken boolean not null default true,       -- pode misturar pedidos na coqueteleira
  author_nick text not null default 'Meu Bar', is_public boolean not null default true,
  created_at timestamptz default now()
);
create table bar_prices (
  bar_id uuid references bars on delete cascade, recipe_id uuid references recipes on delete cascade,
  price numeric(8,2) not null, primary key (bar_id, recipe_id)
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references bars on delete cascade,
  recipe_id uuid not null references recipes on delete cascade,
  client_name text not null, qty int not null default 1, note text, price numeric(8,2),
  status text not null default 'pending' check (status in ('pending','ready','done')),
  paid boolean not null default false,
  created_at timestamptz default now(), ready_at timestamptz
);
create index on orders (bar_id, created_at desc);
alter table bars enable row level security; alter table bar_items enable row level security;
alter table recipes enable row level security; alter table bar_prices enable row level security;
alter table orders enable row level security;
create policy "bars" on bars for all using (owner=auth.uid()) with check (owner=auth.uid());
create policy "itens" on bar_items for all using (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid())) with check (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid()));
create policy "precos" on bar_prices for all using (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid())) with check (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid()));
create policy "pedidos" on orders for all using (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid())) with check (exists(select 1 from bars b where b.id=bar_id and b.owner=auth.uid()));
create policy "receitas ler" on recipes for select using (is_public or owner=auth.uid());
create policy "receitas criar" on recipes for insert with check (owner=auth.uid());
create policy "receitas editar" on recipes for update using (owner=auth.uid());
create policy "receitas apagar" on recipes for delete using (owner=auth.uid());
insert into storage.buckets (id,name,public) values ('recipes','recipes',true) on conflict do nothing;
create policy "fotos ver" on storage.objects for select using (bucket_id='recipes');
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
alter publication supabase_realtime add table orders;

-- Receitas iniciais (oficiais, sem dono)
insert into recipes (name, category, ingredients, steps, story, author_nick) values
('Gin Tônica','Refrescantes','[{"q":"50 ml","n":"Gin"},{"q":"150 ml","n":"Água tônica"},{"q":"1 fatia","n":"Limão"},{"q":"","n":"Gelo"}]','Encha a taça com gelo, adicione o gin, complete com a tônica e finalize com o limão.','Nasceu entre soldados britânicos na Índia, que misturavam quinino (contra malária) com gin.','Meu Bar'),
('Caipirinha','Cítricos','[{"q":"60 ml","n":"Cachaça"},{"q":"1","n":"Limão"},{"q":"2 colheres","n":"Açúcar"},{"q":"","n":"Gelo"}]','Macere o limão com o açúcar, adicione gelo e a cachaça. Misture bem.','O drink nacional do Brasil.','Meu Bar'),
('Moscow Mule','Refrescantes','[{"q":"50 ml","n":"Vodka"},{"q":"15 ml","n":"Limão"},{"q":"120 ml","n":"Ginger beer"},{"q":"","n":"Gelo"}]','Na caneca de cobre com gelo, junte vodka e limão, complete com ginger beer.','Criado nos anos 1940 nos EUA para popularizar a vodka.','Meu Bar'),
('Mojito','Tropicais','[{"q":"50 ml","n":"Rum"},{"q":"8 folhas","n":"Hortelã"},{"q":"1","n":"Limão"},{"q":"2 colheres","n":"Açúcar"},{"q":"","n":"Água com gás"},{"q":"","n":"Gelo"}]','Macere hortelã, limão e açúcar. Adicione gelo e rum, complete com água com gás.','Clássico cubano, bebido em Havana há mais de um século.','Meu Bar'),
('Negroni','Fortes','[{"q":"30 ml","n":"Gin"},{"q":"30 ml","n":"Vermute"},{"q":"30 ml","n":"Campari"},{"q":"1 fatia","n":"Laranja"},{"q":"","n":"Gelo"}]','Misture tudo com gelo no copo e finalize com a laranja.','Segundo a lenda, o conde Negroni pediu um Americano com gin, em Florença (1919).','Meu Bar'),
('Old Fashioned','Fortes','[{"q":"60 ml","n":"Whisky"},{"q":"1 colher","n":"Açúcar"},{"q":"2 dashes","n":"Angostura"},{"q":"","n":"Gelo"}]','Dissolva o açúcar com angostura, adicione whisky e gelo, mexa por 30 segundos.','Um dos coquetéis mais antigos dos EUA.','Meu Bar'),
('Margarita','Cítricos','[{"q":"50 ml","n":"Tequila"},{"q":"20 ml","n":"Cointreau"},{"q":"20 ml","n":"Limão"},{"q":"","n":"Gelo"}]','Bata tudo na coqueteleira com gelo e coe na taça com borda de sal.','O rei dos drinks de tequila.','Meu Bar'),
('Piña Colada','Doces & Frutados','[{"q":"50 ml","n":"Rum"},{"q":"30 ml","n":"Leite de coco"},{"q":"90 ml","n":"Suco de abacaxi"},{"q":"","n":"Gelo"}]','Bata tudo no liquidificador com gelo e sirva gelado.','Criada em Porto Rico, nos anos 1950.','Meu Bar'),
('Aperol Spritz','Aperitivos','[{"q":"60 ml","n":"Aperol"},{"q":"90 ml","n":"Espumante"},{"q":"30 ml","n":"Água com gás"},{"q":"1 fatia","n":"Laranja"},{"q":"","n":"Gelo"}]','Na taça com gelo, junte espumante, Aperol e um toque de água com gás.','O aperitivo das tardes italianas.','Meu Bar'),
('Cuba Libre','Refrescantes','[{"q":"50 ml","n":"Rum"},{"q":"120 ml","n":"Coca-Cola"},{"q":"1 fatia","n":"Limão"},{"q":"","n":"Gelo"}]','Gelo no copo, rum, complete com a cola e esprema o limão.','Rum com cola, em Havana, por volta de 1900.','Meu Bar'),
('Whisky Sour','Cítricos','[{"q":"60 ml","n":"Whisky"},{"q":"30 ml","n":"Limão"},{"q":"20 ml","n":"Xarope de açúcar"},{"q":"","n":"Gelo"}]','Bata tudo na coqueteleira com gelo e coe no copo.','Equilíbrio entre ácido e doce.','Meu Bar'),
('Tom Collins','Refrescantes','[{"q":"50 ml","n":"Gin"},{"q":"30 ml","n":"Limão"},{"q":"15 ml","n":"Xarope de açúcar"},{"q":"","n":"Água com gás"},{"q":"","n":"Gelo"}]','Misture gin, limão e xarope no copo alto com gelo e complete com água com gás.','Longo e muito refrescante.','Meu Bar');

update recipes set shaken=false where name in ('Gin Tônica','Cuba Libre','Moscow Mule','Aperol Spritz','Tom Collins','Piña Colada');
