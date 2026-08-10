begin;

do $$
declare
  reviewed_rubric constant jsonb := '{"criteria":[{"name":"Alignment and posture","weight":20},{"name":"Breath coordination","weight":25},{"name":"Phrase control","weight":20},{"name":"Healthy vocal production","weight":20},{"name":"Preparation and completion","weight":15}]}'::jsonb;
  legacy_rubric constant jsonb := '{"criteria":["Balanced alignment","Coordinated breath","Sustained phrase control","Prepared creative delivery"]}'::jsonb;
begin
  update public.activities
  set rubric=legacy_rubric
  where id='6ff39598-9e2c-4efd-8f9e-cd6d71d6d4db'::uuid
    and title='Breath Control Studio Challenge'
    and status='published'
    and required
    and xp_type='core'
    and xp_reward=350
    and passing_score=70
    and rubric=reviewed_rubric;

  if not found then
    raise exception 'Rollback refused because the challenge no longer matches the E6.1 reviewed rubric state';
  end if;
end $$;

commit;
