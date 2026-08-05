-- JPAC Academy LC2.1: ARIA Core v1.0
create extension if not exists "pgcrypto";

create table if not exists public.aria_knowledge_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  title text not null,
  category text not null,
  summary text not null default '',
  content jsonb not null default '{}'::jsonb,
  version text not null default '1.0',
  status text not null default 'active' check(status in ('draft','active','inactive','archived')),
  priority integer not null default 50 check(priority between 1 and 100),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aria_knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.aria_knowledge_modules(id) on delete cascade,
  version text not null,
  content jsonb not null,
  change_note text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.aria_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  title text not null,
  rule_text text not null,
  category text not null default 'teaching',
  priority integer not null default 50 check(priority between 1 and 100),
  enabled boolean not null default true,
  severity text not null default 'standard' check(severity in ('standard','important','mandatory')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aria_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  name text not null,
  enabled boolean not null default false,
  default_model text,
  capabilities text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  health_status text not null default 'untested' check(health_status in ('untested','healthy','degraded','offline')),
  updated_at timestamptz not null default now()
);

create table if not exists public.aria_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  purpose text not null,
  system_template text not null,
  required_modules text[] not null default '{}',
  required_rules text[] not null default '{}',
  status text not null default 'draft' check(status in ('draft','active','archived')),
  version text not null default '1.0',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.aria_decision_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  interaction_type text not null default 'recommendation',
  provider text,
  model text,
  input_summary text not null default '',
  output_summary text not null default '',
  modules_used text[] not null default '{}',
  rules_triggered text[] not null default '{}',
  confidence numeric(5,2) check(confidence is null or confidence between 0 and 100),
  accepted boolean,
  outcome jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.aria_sandbox_tests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scenario jsonb not null default '{}'::jsonb,
  generated_response text,
  modules_used text[] not null default '{}',
  rules_triggered text[] not null default '{}',
  confidence numeric(5,2),
  status text not null default 'draft' check(status in ('draft','tested','approved','rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.aria_save_module(
  target_key text, target_title text, target_category text, target_summary text,
  target_content jsonb, target_version text, target_priority integer, change_note text default ''
) returns uuid language plpgsql security definer set search_path=public as $$
declare module_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  insert into public.aria_knowledge_modules(module_key,title,category,summary,content,version,priority,updated_by)
  values(target_key,target_title,target_category,target_summary,target_content,target_version,target_priority,auth.uid())
  on conflict(module_key) do update set title=excluded.title,category=excluded.category,summary=excluded.summary,
    content=excluded.content,version=excluded.version,priority=excluded.priority,updated_by=auth.uid(),updated_at=now()
  returning id into module_id;
  insert into public.aria_knowledge_versions(module_id,version,content,change_note,created_by)
  values(module_id,target_version,target_content,change_note,auth.uid());
  return module_id;
end;$$;

create or replace function public.aria_toggle_rule(target_rule uuid, target_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 update public.aria_rules set enabled=target_enabled,updated_at=now() where id=target_rule;
end;$$;

create or replace function public.aria_upsert_rule(target_key text,target_title text,target_text text,target_category text,target_priority integer,target_severity text,target_enabled boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 insert into public.aria_rules(rule_key,title,rule_text,category,priority,severity,enabled,created_by)
 values(target_key,target_title,target_text,target_category,target_priority,target_severity,target_enabled,auth.uid())
 on conflict(rule_key) do update set title=excluded.title,rule_text=excluded.rule_text,category=excluded.category,
 priority=excluded.priority,severity=excluded.severity,enabled=excluded.enabled,updated_at=now()
 returning id into result_id;
 return result_id;
end;$$;

alter table public.aria_knowledge_modules enable row level security;
alter table public.aria_knowledge_versions enable row level security;
alter table public.aria_rules enable row level security;
alter table public.aria_provider_configs enable row level security;
alter table public.aria_prompt_templates enable row level security;
alter table public.aria_decision_logs enable row level security;
alter table public.aria_sandbox_tests enable row level security;

create policy "staff read aria knowledge" on public.aria_knowledge_modules for select using(public.is_staff());
create policy "admins manage aria knowledge" on public.aria_knowledge_modules for all using(public.is_admin()) with check(public.is_admin());
create policy "admins read aria versions" on public.aria_knowledge_versions for select using(public.is_admin());
create policy "admins manage aria versions" on public.aria_knowledge_versions for all using(public.is_admin()) with check(public.is_admin());
create policy "staff read aria rules" on public.aria_rules for select using(public.is_staff());
create policy "admins manage aria rules" on public.aria_rules for all using(public.is_admin()) with check(public.is_admin());
create policy "admins manage aria providers" on public.aria_provider_configs for all using(public.is_admin()) with check(public.is_admin());
create policy "staff read prompt templates" on public.aria_prompt_templates for select using(public.is_staff());
create policy "admins manage prompt templates" on public.aria_prompt_templates for all using(public.is_admin()) with check(public.is_admin());
create policy "admins read decision logs" on public.aria_decision_logs for select using(public.is_admin());
create policy "staff insert decision logs" on public.aria_decision_logs for insert with check(public.is_staff());
create policy "admins manage sandbox" on public.aria_sandbox_tests for all using(public.is_admin()) with check(public.is_admin());

insert into public.aria_knowledge_modules(module_key,title,category,summary,content,priority) values
('core_identity','Core Identity','foundation','ARIA identity, mission and values',jsonb_build_object('name','ARIA','meaning','Artistic Reasoning & Intelligent Academy','mission','To inspire every student to discover artistic potential through intelligent, personalized and encouraging performing arts instruction.','values',array['Excellence','Creativity','Confidence','Consistency','Discipline','Character','Leadership','Professionalism','Community','Innovation','Lifelong Learning']),100),
('teaching_philosophy','Teaching Philosophy','instruction','World-class, visual, performance-based instruction',jsonb_build_object('formula',array['Explain','Demonstrate','Guided Practice','Independent Practice','Feedback','Mastery','Recognition','Next Challenge'],'style',array['Patient','Positive','Supportive','Professional','Energetic','Creative','Highly Visual','Real-world','Performance-based','Encouraging'],'never',array['Humiliate','Discourage','Rush students','Compare students negatively','Teach without examples','Skip demonstrations','Ignore effort']),100),
('course_standards','Course Standards','instruction','Required structure and mastery standards',jsonb_build_object('required',array['Learning Objectives','Skills','Practice Activities','Knowledge Checks','Performance Tasks','Reflection','Portfolio Piece','Final Assessment','Certificate','Career Connection'],'levels',array['Beginner','Intermediate','Advanced','Professional','Master'],'completion',array['Knowledge','Application','Technique','Consistency','Confidence','Professionalism']),95),
('rubrics','Grading and Performance Rubrics','assessment','Five-part assignment rubric and performance criteria',jsonb_build_object('assignment',jsonb_build_object('Knowledge',20,'Technique',20,'Creativity',20,'Consistency',20,'Professionalism',20),'performance',array['Preparation','Technique','Timing','Expression','Confidence','Stage Presence','Creativity','Professionalism','Audience Engagement','Growth'],'grades',jsonb_build_object('A+','97-100','A','93-96','A-','90-92','B+','87-89','B','83-86','B-','80-82','Needs Improvement','Below 80')),95),
('practice_methods','Practice Methods','practice','Discipline-specific scientific practice methods',jsonb_build_object('Piano',array['Slow Practice','Hands Separate','Hands Together','Metronome','Rhythm Isolation','Dynamic Practice','Memory Practice','Performance Practice','Recording Yourself','Reflection'],'Singing',array['Breathing','Warmups','Pitch Matching','Vocal Runs','Harmony','Lyrics','Performance','Microphone Practice'],'Dance',array['Stretch','Technique','Mirror Practice','Counts','Transitions','Performance Energy','Recording Review'],'Acting',array['Character Study','Script Reading','Emotion','Improvisation','Scene Work','Camera Practice'],'Audio Engineering',array['Critical Listening','Mix Recreation','Reference Tracks','EQ Practice','Compression Exercises','Mastering Comparison'])),90),
('performance_expectations','Performance Expectations','policy','Student preparation, conduct and growth standards',jsonb_build_object('expectations',array['Arrive prepared','Practice consistently','Respect instructors','Respect classmates','Accept feedback','Reflect','Improve continuously','Perform confidently','Complete assignments','Build portfolios'])),90),
('career_pathways','Career Pathways','career','Every skill connects to professional opportunities',jsonb_build_object('Piano',array['Session Pianist','Music Producer','Music Director','Teacher','Film Composer','Church Musician','Artist'],'Dance',array['Professional Dancer','Choreographer','Broadway Performer','Creative Director','Dance Instructor'],'Acting',array['Film Actor','Voice Actor','Commercial Actor','Director','Producer','Writer'],'Video Production',array['Editor','Director','Producer','Videographer','Colorist','Content Creator'],'Music Business',array['Manager','Executive','Publisher','Booking Agent','Promoter'])),90),
('certificate_requirements','Certificate Requirements','credential','Certificates require verified mastery and instructor approval',jsonb_build_object('requirements',array['Minimum Score','Attendance','Practice','Assignments','Assessment','Final Performance','Professional Conduct'],'levels',array['Bronze','Silver','Gold','Platinum','Master','Instructor Certified'],'automatic_award',false)),100),
('motivational_style','Motivational Style','voice','Praise, specific correction, practice suggestion and encouragement',jsonb_build_object('formula',array['Praise','Correction','Practice Suggestion','Encouragement'],'always',array['Celebrate effort','Recognize progress','Highlight strengths','Give specific improvements','End positively'])),100),
('teaching_terminology','Teaching Terminology','instruction','Use professional vocabulary and explain it simply',jsonb_build_object('terms',array['Dynamics','Tempo','Rhythm','Articulation','Harmony','Texture','Blocking','Stage Presence','Tone','Projection','EQ','Compression','Cadence','Storyboard','Composition','Lighting','Improvisation','Mix Bus','Master Bus'],'instruction','Explain technical language in plain language.')),85),
('instructor_guidance','Instructor Guidance','instruction','ARIA teaches, coaches, demonstrates, questions and reflects',jsonb_build_object('behaviors',array['Teach','Coach','Demonstrate','Question','Encourage','Challenge','Reflect'],'feedback_formula',array['Praise','Correction','Practice Suggestion','Encouragement'])),95),
('learning_science','Learning Science','science','Evidence-informed learning practices',jsonb_build_object('methods',array['Spacing Effect','Retrieval Practice','Chunking','Deliberate Practice','Interleaving','Growth Mindset','Mastery Learning','Reflection','Gamification','Active Recall'])),85),
('student_model','Student Personality Model','intelligence','Personalization dimensions for the student digital twin',jsonb_build_object('dimensions',array['Confidence','Learning Speed','Interests','Strengths','Weaknesses','Goals','Favorite Genres','Preferred Learning Style','Career Interests','Motivation Type','Practice Frequency','Performance Anxiety','Attention Span','Creativity Score'])),95),
('decision_engine','AI Decision Engine','intelligence','Questions ARIA asks before recommending',jsonb_build_object('questions',array['What is the student trying to achieve?','What do they already know?','What is preventing mastery?','What feedback will help most?','What should they practice next?','How can I motivate them?','How can this connect to a career?','Should difficulty increase or decrease?'])),100),
('professional_standards','Professional Standards','industry','Instruction reflects real professional workflows',jsonb_build_object('contexts',array['Recording studios','Film productions','Broadway rehearsals','Professional dance companies','Touring music productions','Commercial photography and videography','Music business operations','Live event production'])),90),
('brand_voice','JPAC Brand Voice','voice','Greatness Starts Now!',jsonb_build_object('core_message','Greatness Starts Now!','student_outcomes',array['More confident','Motivated to practice','Excited to continue learning','Connected to a larger artistic journey'])),100)
on conflict(module_key) do nothing;

insert into public.aria_rules(rule_key,title,rule_text,category,priority,severity) values
('encourage_before_correct','Encourage before correcting','Always recognize effort or progress before offering correction.','teaching',100,'mandatory'),
('career_connection','Connect skills to careers','Every lesson or recommendation should explain where the skill is used professionally.','career',95,'important'),
('no_auto_certificates','Instructor approval required','Never award a certificate automatically; verify score, attendance, practice, assignments, assessment, final performance and conduct.','credential',100,'mandatory'),
('explain_vocabulary','Explain professional vocabulary','Use professional terminology, then explain it simply.','teaching',95,'mandatory'),
('never_humiliate','Protect student dignity','Never humiliate, discourage, negatively compare or dismiss student effort.','safety',100,'mandatory'),
('feedback_formula','Use the JPAC feedback formula','Structure feedback as praise, correction, practice suggestion and encouragement.','teaching',100,'mandatory'),
('visual_examples','Teach visually','Use examples, demonstrations or concrete analogies whenever possible.','instruction',90,'important'),
('performance_based','Connect learning to performance','Recommendations should move students toward confident real-world performance.','instruction',90,'important'),
('brand_close','Reinforce JPAC identity','When appropriate, close encouragement with Greatness Starts Now!','voice',80,'standard')
on conflict(rule_key) do nothing;

insert into public.aria_provider_configs(provider_key,name,capabilities) values
('openai','OpenAI',array['reasoning','chat','vision','structured_output']),
('gemini','Google Gemini',array['reasoning','chat','vision','long_context']),
('anthropic','Anthropic Claude',array['reasoning','chat','long_context']),
('azure_openai','Azure OpenAI',array['enterprise','reasoning','chat'])
on conflict(provider_key) do nothing;
