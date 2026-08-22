-- Seed the missing Digital AI Creator launch course shell only.
begin;

do $$
begin
  if exists (
    select 1 from public.courses
    where slug <> 'digital-ai-creator'
      and (slug ilike '%digital%ai%creator%' or title ilike '%digital%ai%creator%' or title ilike '%ai creator%')
  ) then
    raise exception 'Likely Digital AI Creator course candidate exists under another identity; seed blocked';
  end if;

  if exists (
    select 1 from public.courses
    where slug='digital-ai-creator'
      and (title<>'Digital AI Creator' or status<>'published' or module_count<>10)
  ) then
    raise exception 'Existing digital-ai-creator course shell is incompatible';
  end if;

  insert into public.courses (slug, title, description, module_count, total_xp, status)
  select
    'digital-ai-creator',
    'Digital AI Creator',
    'AI-assisted visual storytelling, creative direction, and responsible digital production.',
    10,
    50000,
    'published'
  where not exists (select 1 from public.courses where slug='digital-ai-creator')
  on conflict (slug) do nothing;

  if (select count(*) from public.courses where slug='digital-ai-creator' and title='Digital AI Creator' and status='published' and module_count=10) <> 1 then
    raise exception 'Digital AI Creator course shell seed did not produce one exact canonical row';
  end if;
end $$;

commit;
