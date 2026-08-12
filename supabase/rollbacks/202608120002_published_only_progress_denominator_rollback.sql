begin;

-- Restore the prior denominator definitions. No stored-progress reconciliation is performed.
create or replace function public.jpac_sync_enrollment_progress(target_student uuid,target_course uuid)
returns numeric language plpgsql security definer set search_path=public as $$
declare enrollment_row public.enrollments%rowtype;total_modules integer:=0;mastered_modules integer:=0;computed_progress numeric(5,2):=0;
begin
 select * into enrollment_row from public.enrollments where student_id=target_student and course_id=target_course for update;
 if enrollment_row.id is null then return 0; end if;
 select count(*) into total_modules from public.course_modules m join public.course_levels l on l.id=m.course_level_id where m.course_id=target_course and l.level_number=enrollment_row.level and m.status<>'archived';
 if total_modules>0 then
  select count(distinct m.id) into mastered_modules from public.course_modules m join public.course_levels l on l.id=m.course_level_id where m.course_id=target_course and l.level_number=enrollment_row.level and m.status<>'archived' and exists(select 1 from public.xp_ledger x where x.student_id=target_student and x.module_id=m.id and x.xp_type='core' and x.metadata->>'component'='mastery');
  computed_progress:=round(mastered_modules::numeric/total_modules::numeric*100,2);
 end if;
 update public.enrollments set progress=computed_progress,updated_at=now() where id=enrollment_row.id;
 update public.course_progress set percent_complete=computed_progress,updated_at=now() where enrollment_id=enrollment_row.id and student_id=target_student and course_id=target_course;
 return computed_progress;
end;$$;
revoke all on function public.jpac_sync_enrollment_progress(uuid,uuid) from public,anon,authenticated;

create or replace function public.jpac_enforce_canonical_enrollment_progress()
returns trigger language plpgsql security definer set search_path=public as $$
declare total_modules integer:=0;mastered_modules integer:=0;
begin
 select count(*) into total_modules from public.course_modules m join public.course_levels l on l.id=m.course_level_id where m.course_id=new.course_id and l.level_number=new.level and m.status<>'archived';
 if total_modules=0 then new.progress:=0;return new;end if;
 select count(distinct m.id) into mastered_modules from public.course_modules m join public.course_levels l on l.id=m.course_level_id where m.course_id=new.course_id and l.level_number=new.level and m.status<>'archived' and exists(select 1 from public.xp_ledger x where x.student_id=new.student_id and x.module_id=m.id and x.xp_type='core' and x.metadata->>'component'='mastery');
 new.progress:=round(mastered_modules::numeric/total_modules::numeric*100,2);return new;
end;$$;
revoke all on function public.jpac_enforce_canonical_enrollment_progress() from public,anon,authenticated;

comment on column public.enrollments.progress is
 'Canonical active-level mastery percentage: mastered modules divided by all non-archived modules in the enrollment current level. Not lesson progress or XP progress.';

commit;
