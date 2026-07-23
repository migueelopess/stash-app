-- Fotos de perfil: bucket público de avatares. Cada utilizador só escreve
-- na sua própria pasta (prefixo = auth.uid()); leitura pública para a foto
-- poder aparecer via <img>. O nome e a cor do avatar vivem no user_metadata
-- do Supabase Auth (sem tabela nova).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Leitura pública das imagens do bucket
create policy "avatares_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload só para a pasta do próprio utilizador
create policy "avatares_upload_proprio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Substituir a própria foto
create policy "avatares_update_proprio"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Apagar a própria foto
create policy "avatares_delete_proprio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
