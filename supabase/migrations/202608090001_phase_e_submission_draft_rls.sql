begin;

-- Preserve student-owned draft editing without allowing a student to author
-- assessment, reviewer, XP, credential, or automation state.
drop policy if exists "submissions own draft update" on public.submissions;
create policy "submissions own draft update" on public.submissions
for update to authenticated
using (
  student_id = auth.uid()
  and status = 'draft'
)
with check (
  student_id = auth.uid()
  and status = 'draft'
  and score is null
  and teacher_feedback is null
  and reviewed_by is null
  and reviewed_at is null
  and xp_awarded = 0
  and passport_eligible = false
  and automation_processed_at is null
);

commit;
