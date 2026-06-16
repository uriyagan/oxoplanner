-- Run this AFTER creating the public "box-images" bucket in the Storage UI.
-- Lets signed-in admins upload/replace/delete images (public read is already on
-- because the bucket is public). Safe to re-run.

drop policy if exists "auth manage box images" on storage.objects;
create policy "auth manage box images" on storage.objects
  for all to authenticated
  using (bucket_id = 'box-images')
  with check (bucket_id = 'box-images');
