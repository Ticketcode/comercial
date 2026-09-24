-- Faltaban políticas de escritura para el catálogo: la pantalla /catalog
-- deja editar precios pero RLS solo tenía "select" para estas tablas.
create policy "catalog_items: authenticated update" on catalog_items
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "logistics_rate_items: authenticated update" on logistics_rate_items
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "price_scale_items: authenticated update" on price_scale_items
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
