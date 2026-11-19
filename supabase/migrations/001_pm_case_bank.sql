-- AI & Tech solution case bank
-- Project-management system of record for Cisco public architectures and planning scenarios.
-- Local app search uses data/index.json. This schema is the Supabase / pgvector store.

create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;

-- The product language is locked to English. Codes stay stable. The UI reads name_en.
create table app_settings (
  id boolean primary key default true check (id),
  default_language text not null default 'en' check (default_language = 'en')
);

insert into app_settings (default_language) values ('en');

comment on table app_settings is 'Singleton. default_language cannot leave en.';

-- PMI process groups. Codes are stable. name_en is the label the interface shows.
create table process_groups (
  code text primary key,
  name_ko text not null,
  name_en text not null,
  sort_order int not null
);

insert into process_groups (code, name_ko, name_en, sort_order) values
  ('initiate', 'Initiating', 'Initiating', 1),
  ('plan', 'Planning', 'Planning', 2),
  ('execute', 'Executing', 'Executing', 3),
  ('monitor', 'Monitoring and controlling', 'Monitoring and controlling', 4),
  ('close', 'Closing', 'Closing', 5);

-- PMI knowledge areas plus security and AI governance.
create table knowledge_areas (
  code text primary key,
  name_ko text not null,
  name_en text not null,
  description text not null
);

insert into knowledge_areas (code, name_ko, name_en, description) values
  ('integration', 'Integration', 'Integration', 'Charter, change control, stage gates, and lessons in one plan.'),
  ('scope', 'Scope', 'Scope', 'In scope, out of scope, and acceptance. Do not mix a pilot with an enterprise rollout.'),
  ('schedule', 'Schedule', 'Schedule', 'Lead time, duration band, milestones, and predecessors.'),
  ('cost', 'Cost', 'Cost', 'CapEx and OpEx planning bands. Not a list price and not a customer result.'),
  ('quality', 'Quality', 'Quality', 'Stage gates and acceptance criteria.'),
  ('resource', 'Resource', 'Resource', 'Roles and staffing. Tied to RACI Responsible.'),
  ('communications', 'Communications', 'Communications', 'Sponsor reports, user notices, and the exception channel.'),
  ('risk', 'Risk', 'Risk', 'Probability times impact, response, trigger, and contingency.'),
  ('procurement', 'Procurement', 'Procurement', 'Licenses, hardware lead time, and contracting.'),
  ('stakeholder', 'Stakeholder', 'Stakeholder', 'Influence, engagement, and the decision maker.'),
  ('security', 'Security', 'Security', 'Visibility, control placement, the runbook, and detection and response.'),
  ('ai_governance', 'AI governance', 'AI governance', 'Training-data rights, evaluation, human approval, and model limits.');

create table solution_cases (
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  slug text not null unique,
  title text not null,
  title_en text,
  language text not null default 'en' check (language = 'en'),
  record_type text not null check (record_type in ('public_announcement', 'validated_design', 'reference_scenario', 'video_demo', 'partner_guide')),
  fidelity text not null check (fidelity in ('primary_source', 'public_composite')),
  fidelity_note text not null,
  status text not null default 'inbox' check (status in ('inbox', 'reviewed', 'published', 'archived')),
  confidentiality text not null default 'public' check (confidentiality in ('public', 'internal', 'restricted')),
  executive_summary text not null,
  problem_statement text not null default '',
  opportunity text not null default '',
  strategic_alignment text not null default '',
  business_value text not null default '',
  industry text not null,
  industry_label text not null,
  customer_segment text not null default '',
  customer_segment_label text not null default '',
  region text not null default '',
  regulatory_context text[] not null default '{}',
  company_size_band text not null default '',
  deployment_model text not null default '',
  deployment_model_label text not null default '',
  architecture_pattern text not null default '',
  complexity text not null default 'medium' check (complexity in ('low', 'medium', 'high', 'very_high')),
  planning_band_note text not null default '',
  deal_size_low_usd int,
  deal_size_high_usd int,
  deal_size_band text,
  lead_time_weeks_low int,
  lead_time_weeks_high int,
  duration_weeks_low int,
  duration_weeks_high int,
  cisco_solutions text[] not null default '{}',
  partner_technologies text[] not null default '{}',
  ai_capabilities text[] not null default '{}',
  security_capabilities text[] not null default '{}',
  aliases text[] not null default '{}',
  scope_in text[] not null default '{}',
  scope_out text[] not null default '{}',
  success_criteria text[] not null default '{}',
  outcome_type text not null default 'expected_planning' check (outcome_type in ('published', 'expected_planning')),
  outcomes text[] not null default '{}',
  video_url text,
  video_title text,
  published_on date,
  collected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deal_size_low_usd is null or deal_size_high_usd is null or deal_size_low_usd <= deal_size_high_usd),
  check (lead_time_weeks_low is null or lead_time_weeks_high is null or lead_time_weeks_low <= lead_time_weeks_high),
  check (duration_weeks_low is null or duration_weeks_high is null or duration_weeks_low <= duration_weeks_high)
);

comment on table solution_cases is 'One row is a solution case a PM opens. public_composite is a planning scenario from public material, not a customer result.';
comment on column solution_cases.language is 'Locked to en. The interface does not switch the stored language.';
comment on column solution_cases.planning_band_note is '금액·기간을 읽을 때 항상 같이 보여주는 고지.';
comment on column solution_cases.deal_size_low_usd is '1차년도 외부 지출 계획 밴드의 하한. 고시 가격이 아니다.';
comment on column solution_cases.fidelity is 'primary_source는 공개 발표 요약. public_composite는 그 발표를 산업 제약에 얹은 계획.';

create table assumptions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  statement text not null,
  owner_role text not null,
  status text not null check (status in ('open', 'validated', 'invalid'))
);

create table constraints_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  constraint_type text not null,
  statement text not null
);

create table stakeholders (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  role_code text not null,
  role_name text not null,
  organization text not null,
  interest text not null,
  influence text not null check (influence in ('low', 'medium', 'high')),
  engagement text not null,
  cadence text not null
);

create table requirements (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  req_code text not null,
  knowledge_area text not null references knowledge_areas(code),
  priority text not null check (priority in ('must', 'should', 'could')),
  statement text not null,
  acceptance text not null,
  source text not null,
  unique (case_id, req_code)
);

create table raci_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  activity text not null,
  phase text not null references process_groups(code),
  knowledge_area text not null references knowledge_areas(code),
  responsible text[] not null,
  accountable text not null,
  consulted text[] not null default '{}',
  informed text[] not null default '{}'
);

comment on column raci_items.accountable is '한 활동의 Accountable은 한 역할이다.';

create table wbs_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  wbs_code text not null,
  parent_code text,
  phase text not null references process_groups(code),
  knowledge_area text not null references knowledge_areas(code),
  name text not null,
  description text not null,
  deliverable text not null,
  owner_role text not null,
  duration_days_low int,
  duration_days_high int,
  predecessors text[] not null default '{}',
  acceptance text not null,
  is_milestone boolean not null default false,
  sort_order int not null,
  unique (case_id, wbs_code),
  check (duration_days_low is null or duration_days_high is null or duration_days_low <= duration_days_high)
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  name text not null,
  phase text not null references process_groups(code),
  week_offset_low int not null,
  week_offset_high int not null,
  criteria text not null,
  check (week_offset_low <= week_offset_high)
);

create table risks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  risk_code text not null,
  title text not null,
  description text not null,
  category text not null,
  probability int not null check (probability between 1 and 5),
  impact int not null check (impact between 1 and 5),
  score int generated always as (probability * impact) stored,
  response_strategy text not null check (response_strategy in ('avoid', 'mitigate', 'transfer', 'accept', 'exploit')),
  mitigation text not null,
  contingency text not null default '',
  owner_role text not null,
  trigger_condition text not null,
  unique (case_id, risk_code)
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  issue_code text not null,
  title text not null,
  status text not null check (status in ('open', 'closed')),
  owner_role text not null,
  next_action text not null,
  unique (case_id, issue_code)
);

create table kpis (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  name text not null,
  baseline text not null,
  target text not null,
  unit text not null,
  method text not null,
  owner_role text not null,
  cadence text not null
);

comment on column kpis.method is '계획 목표인지, 공개된 제품 설계 목표인지, 파일럿에서 잴 값인지를 적는다.';

create table cost_lines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  category text not null,
  name text not null,
  cost_type text not null check (cost_type in ('capex', 'opex')),
  low_usd int,
  high_usd int,
  notes text not null default '',
  check (low_usd is null or high_usd is null or low_usd <= high_usd)
);

create table quality_gates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  phase text not null references process_groups(code),
  name text not null,
  criteria text not null,
  owner_role text not null
);

create table communications (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  audience text not null,
  message text not null,
  channel text not null,
  cadence text not null,
  owner_role text not null
);

create table procurement_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  item text not null,
  vendor_type text not null,
  strategy text not null,
  lead_weeks int,
  notes text not null default ''
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  decision_code text not null,
  title text not null,
  choice text not null,
  rationale text not null,
  decided_on date,
  owner_role text not null,
  unique (case_id, decision_code)
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  theme text not null,
  statement text not null,
  applicability text not null
);

create table benefits (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  name text not null,
  measure text not null,
  beneficiary text not null,
  timing text not null
);

-- RAG chunks. 384 dimensions match the air-gapped feature-hash embedder.
-- For Ollama nomic-embed-text, alter this column to vector(768) and rebuild.
create table case_chunks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references solution_cases(id) on delete cascade,
  chunk_index int not null,
  section text not null,
  heading text not null,
  content text not null,
  token_estimate int not null,
  embedding vector(384) not null,
  unique (case_id, chunk_index)
);

create table source_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references solution_cases(id) on delete set null,
  title text not null,
  url text not null,
  publisher text,
  published_on date,
  content_hash text,
  fetched_at timestamptz not null default now()
);

create table collection_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source text not null,
  items_seen int not null default 0,
  items_new int not null default 0,
  status text not null,
  notes text not null default ''
);

create index solution_cases_industry_idx on solution_cases (industry);
create index solution_cases_status_idx on solution_cases (status);
create index solution_cases_solutions_idx on solution_cases using gin (cisco_solutions);
create index solution_cases_title_trgm_idx on solution_cases using gin (title gin_trgm_ops);
create index case_chunks_embedding_hnsw_idx on case_chunks using hnsw (embedding vector_cosine_ops);
create index risks_case_score_idx on risks (case_id, score desc);
create index wbs_case_sort_idx on wbs_items (case_id, sort_order);
create index source_documents_url_idx on source_documents (url);

create or replace function touch_solution_case()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger solution_cases_touch
  before update on solution_cases
  for each row execute function touch_solution_case();

-- Cosine distance via pgvector <=> . Returned similarity is 1 - distance.
create or replace function match_case_chunks(
  query_embedding vector(384),
  match_count int default 5,
  filter_industry text default null,
  filter_solution text default null
)
returns table (
  id uuid,
  case_id uuid,
  case_code text,
  slug text,
  title text,
  section text,
  heading text,
  content text,
  industry text,
  similarity float
)
language sql
stable
as $$
  select
    ch.id,
    ch.case_id,
    c.case_code,
    c.slug,
    c.title,
    ch.section,
    ch.heading,
    ch.content,
    c.industry,
    (1 - (ch.embedding <=> query_embedding))::float as similarity
  from case_chunks ch
  join solution_cases c on c.id = ch.case_id
  where c.status = 'published'
    and c.confidentiality = 'public'
    and (filter_industry is null or c.industry = filter_industry)
    and (filter_solution is null or filter_solution = any (c.cisco_solutions))
  order by ch.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 20));
$$;

create view pm_case_portfolio as
select
  case_code,
  title,
  industry,
  industry_label,
  customer_segment_label,
  complexity,
  fidelity,
  outcome_type,
  status,
  deal_size_band,
  deal_size_low_usd,
  deal_size_high_usd,
  lead_time_weeks_low,
  lead_time_weeks_high,
  duration_weeks_low,
  duration_weeks_high,
  cisco_solutions,
  planning_band_note
from solution_cases;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

alter table solution_cases enable row level security;
alter table case_chunks enable row level security;
alter table stakeholders enable row level security;
alter table raci_items enable row level security;
alter table wbs_items enable row level security;
alter table risks enable row level security;
alter table kpis enable row level security;
alter table source_documents enable row level security;

-- Anonymous and signed-in readers see published public cases only.
-- Restricted rows stay invisible until a later policy checks a team claim.
create policy public_cases_read on solution_cases
  for select to anon, authenticated
  using (status = 'published' and confidentiality = 'public');

create policy public_chunks_read on case_chunks
  for select to anon, authenticated
  using (exists (
    select 1 from solution_cases c
    where c.id = case_chunks.case_id
      and c.status = 'published'
      and c.confidentiality = 'public'
  ));

create policy public_stakeholders_read on stakeholders
  for select to anon, authenticated
  using (exists (
    select 1 from solution_cases c
    where c.id = stakeholders.case_id and c.status = 'published' and c.confidentiality = 'public'
  ));

create policy public_raci_read on raci_items
  for select to anon, authenticated
  using (exists (
    select 1 from solution_cases c
    where c.id = raci_items.case_id and c.status = 'published' and c.confidentiality = 'public'
  ));

create policy public_wbs_read on wbs_items
  for select to anon, authenticated
  using (exists (
    select 1 from solution_cases c
    where c.id = wbs_items.case_id and c.status = 'published' and c.confidentiality = 'public'
  ));

create policy public_risks_read on risks
  for select to anon, authenticated
  using (exists (
    select 1 from solution_cases c
    where c.id = risks.case_id and c.status = 'published' and c.confidentiality = 'public'
  ));

create policy public_kpis_read on kpis
  for select to anon, authenticated
  using (exists (
    select 1 from solution_cases c
    where c.id = kpis.case_id and c.status = 'published' and c.confidentiality = 'public'
  ));

grant select on solution_cases, case_chunks, stakeholders, raci_items, wbs_items, risks, kpis, source_documents, pm_case_portfolio to anon, authenticated;

create policy public_sources_read on source_documents
  for select to anon, authenticated
  using (exists (
    select 1 from solution_cases c
    where c.id = source_documents.case_id and c.status = 'published' and c.confidentiality = 'public'
  ));
