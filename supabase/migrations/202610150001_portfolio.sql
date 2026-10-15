-- Run through Supabase migrations. No credentials or fictional professional data.
-- Explicit grants support Data API ON with automatic table/function exposure OFF.
-- Keep public in the API's exposed schemas; never expose the private schema.
grant usage on schema public to anon, authenticated, service_role;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 100),
  created_at timestamptz not null default now()
);
alter table public.admin_profiles enable row level security;
create function private.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$ select exists(select 1 from public.admin_profiles where id = (select auth.uid())); $$;
revoke all on function private.is_admin() from public,anon,authenticated,service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;
create policy admin_read_self on public.admin_profiles for select to authenticated using (id = (select auth.uid()));
revoke all on public.admin_profiles from anon, authenticated;
-- No client may promote itself, including existing administrators.
grant select on public.admin_profiles to authenticated;

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check(singleton),
  site_title text not null default 'MaikuuuTech' check(length(site_title) between 1 and 120),
  developer_name text not null default 'MaikuuuTech' check(length(developer_name) between 1 and 100),
  headline text not null default 'Full-Stack Developer | Mobile Application Developer | IoT Enthusiast' check(length(headline) <= 240),
  introduction text not null default '' check(length(introduction) <= 600),
  biography text not null default '' check(length(biography) <= 12000),
  interests text not null default '' check(length(interests) <= 3000),
  career_goals text not null default '' check(length(career_goals) <= 3000),
  specializations text[] not null default '{}',
  profile_image text not null default '',
  contact_email text not null default '' check(length(contact_email) <= 254),
  location text not null default '' check(length(location) <= 150),
  seo_description text not null default 'The personal developer portfolio of MaikuuuTech.' check(length(seo_description) <= 320),
  og_image text not null default '',
  footer_text text not null default '',
  availability text not null default '' check(length(availability) <= 120),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.site_settings(singleton) values(true);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(title) between 1 and 160),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  short_description text not null default '' check(length(short_description) <= 400),
  description text not null default '' check(length(description) <= 20000),
  problem text not null default '' check(length(problem) <= 10000),
  solution text not null default '' check(length(solution) <= 10000),
  role text not null default '' check(length(role) <= 5000),
  architecture text not null default '' check(length(architecture) <= 10000),
  features text[] not null default '{}',
  category text not null default 'Other' check(length(category) <= 100),
  status text not null default 'In progress' check(status in ('In progress','Completed','Maintained','Archived')),
  start_date date, completion_date date,
  thumbnail text not null default '',
  github_url text not null default '' check(github_url = '' or github_url ~ '^https://'),
  demo_url text not null default '' check(demo_url = '' or demo_url ~ '^https://'),
  documentation_url text not null default '' check(documentation_url = '' or documentation_url ~ '^https://'),
  is_featured boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(completion_date is null or start_date is null or completion_date >= start_date)
);
create index projects_public_order on public.projects(is_published, sort_order, created_at desc);
create function public.project_categories() returns table(category text) language sql stable security invoker set search_path='' as $$
  select distinct p.category from public.projects p where p.is_published order by p.category;
$$;
revoke all on function public.project_categories() from public,anon,authenticated,service_role;
grant execute on function public.project_categories() to anon,authenticated;
create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null, alt_text text not null check(length(alt_text) <= 300),
  sort_order integer not null default 0
);
create index project_images_parent on public.project_images(project_id, sort_order);
create table public.project_technologies (
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check(length(name) between 1 and 80),
  primary key(project_id, name)
);
create table public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check(length(name) between 1 and 100),
  sort_order integer not null default 0, is_published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.skill_categories(name, sort_order) values
('Programming Languages',0),('Frontend Development',1),('Backend Development',2),('Mobile Development',3),('Database Technologies',4),('Cloud and Deployment',5),('IoT and Embedded Systems',6),('Development Tools',7),('Version Control',8),('Other Technologies',9);
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 1 and 100),
  category_id uuid not null references public.skill_categories(id) on delete restrict,
  icon text not null default '' check(length(icon) <= 40),
  description text not null default '' check(length(description) <= 1500),
  sort_order integer not null default 0, is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index skills_category_order on public.skills(category_id, sort_order);
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(title) between 1 and 160),
  organization text not null check(length(organization) between 1 and 160),
  employment_type text not null default '', start_date date not null, end_date date,
  is_current boolean not null default false,
  description text not null default '' check(length(description) <= 10000),
  responsibilities text[] not null default '{}', technologies text[] not null default '{}',
  sort_order integer not null default 0, is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(end_date is null or end_date >= start_date), check(not is_current or end_date is null)
);
create table public.education (
  id uuid primary key default gen_random_uuid(),
  institution text not null check(length(institution) between 1 and 160),
  title text not null check(length(title) between 1 and 160),
  start_date date, end_date date,
  description text not null default '' check(length(description) <= 10000),
  achievements text[] not null default '{}',
  sort_order integer not null default 0, is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(end_date is null or start_date is null or end_date >= start_date)
);
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(title) between 1 and 160),
  organization text not null check(length(organization) between 1 and 160),
  issue_date date, expiration_date date, credential_id text not null default '',
  verification_url text not null default '' check(verification_url = '' or verification_url ~ '^https://'),
  image text not null default '', file text not null default '',
  description text not null default '' check(length(description) <= 10000),
  sort_order integer not null default 0, is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(expiration_date is null or issue_date is null or expiration_date >= issue_date)
);
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(title) between 1 and 160),
  organization text not null default '', category text not null default '', achieved_date date,
  description text not null default '' check(length(description) <= 10000),
  url text not null default '' check(url = '' or url ~ '^https://'),
  sort_order integer not null default 0, is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(title) between 1 and 160),
  description text not null default '' check(length(description) <= 5000),
  icon text not null default '',
  sort_order integer not null default 0, is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null check(length(label) between 1 and 80),
  url text not null check(url ~ '^https://'),
  sort_order integer not null default 0, is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(title) between 1 and 160),
  file text not null check(length(file) > 0),
  sort_order integer not null default 0, is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_published_resume on public.resumes(is_published) where is_published;
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check(length(full_name) between 2 and 100),
  email text not null check(length(email) between 3 and 254),
  subject text not null check(length(subject) between 3 and 180),
  message text not null check(length(message) between 10 and 5000),
  is_read boolean not null default false, is_archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index messages_recent on public.contact_messages(created_at desc);
create table private.contact_rate_limits (
  actor_hash text not null, window_start timestamptz not null, hits integer not null,
  primary key(actor_hash, window_start)
);
revoke all on private.contact_rate_limits from public,anon,authenticated,service_role;

create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
-- Trigger execution does not require direct API-role EXECUTE permission.
revoke all on function private.touch_updated_at() from public,anon,authenticated,service_role;
do $$ declare t text; begin
  foreach t in array array['site_settings','projects','skill_categories','skills','experiences','education','certificates','achievements','services','social_links','resumes','contact_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated_at()', t);
    execute format('create policy admin_manage on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    execute format('grant select,insert,update,delete on public.%I to authenticated', t);
    if t not in ('site_settings','contact_messages','skills') then
      execute format('create policy published_read on public.%I for select to anon, authenticated using (is_published)', t);
      execute format('grant select on public.%I to anon', t);
    end if;
  end loop;
end $$;
create policy settings_read on public.site_settings for select to anon, authenticated using(true);
grant select on public.site_settings to anon;
create policy published_skills on public.skills for select to anon, authenticated using(is_published and exists(select 1 from public.skill_categories c where c.id = category_id and c.is_published));
grant select on public.skills to anon;
do $$ declare t text; begin
  foreach t in array array['project_images','project_technologies'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy child_public on public.%I for select to anon, authenticated using (exists(select 1 from public.projects p where p.id = project_id and p.is_published))',t);
    execute format('create policy child_admin on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t);
  end loop;
end $$;
-- Explicitly no anonymous SELECT/INSERT privileges for contact_messages.
revoke all on public.contact_messages from anon;

-- Atomic project/child writes, running as the caller so RLS still applies.
create function public.save_project(p_id uuid, p_data jsonb) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_project public.projects; v_image jsonb;
begin
  if not private.is_admin() then raise insufficient_privilege; end if;
  v_project := jsonb_populate_record(null::public.projects, p_data);
  if p_id is null then
    insert into public.projects(title,slug,short_description,description,problem,solution,role,architecture,features,category,status,start_date,completion_date,thumbnail,github_url,demo_url,documentation_url,is_featured,is_published,sort_order)
    values(v_project.title,v_project.slug,v_project.short_description,v_project.description,v_project.problem,v_project.solution,v_project.role,v_project.architecture,v_project.features,v_project.category,v_project.status,v_project.start_date,v_project.completion_date,v_project.thumbnail,v_project.github_url,v_project.demo_url,v_project.documentation_url,v_project.is_featured,v_project.is_published,v_project.sort_order) returning id into v_id;
  else
    update public.projects set title=v_project.title,slug=v_project.slug,short_description=v_project.short_description,description=v_project.description,problem=v_project.problem,solution=v_project.solution,role=v_project.role,architecture=v_project.architecture,features=v_project.features,category=v_project.category,status=v_project.status,start_date=v_project.start_date,completion_date=v_project.completion_date,thumbnail=v_project.thumbnail,github_url=v_project.github_url,demo_url=v_project.demo_url,documentation_url=v_project.documentation_url,is_featured=v_project.is_featured,is_published=v_project.is_published,sort_order=v_project.sort_order where id=p_id returning id into v_id;
    if v_id is null then raise no_data_found; end if;
    delete from public.project_images where project_id=v_id;
    delete from public.project_technologies where project_id=v_id;
  end if;
  insert into public.project_technologies(project_id,name) select v_id,value from jsonb_array_elements_text(p_data->'technologies') on conflict do nothing;
  for v_image in select value from jsonb_array_elements(p_data->'gallery') loop
    insert into public.project_images(project_id,path,alt_text,sort_order) values(v_id,v_image->>'path',v_image->>'alt_text',(v_image->>'sort_order')::int);
  end loop;
  return v_id;
end; $$;
revoke all on function public.save_project(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_project(uuid,jsonb) to authenticated;

-- Only the trusted contact endpoint can call this. Counters and message commit together.
create function public.submit_contact(p_actor_hash text,p_full_name text,p_email text,p_subject text,p_message text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_hits integer; v_global integer; v_window timestamptz := date_trunc('hour',now());
begin
  if length(p_actor_hash) <> 64 then raise invalid_parameter_value; end if;
  insert into private.contact_rate_limits values('global',v_window,1) on conflict(actor_hash,window_start) do update set hits=private.contact_rate_limits.hits+1 returning hits into v_global;
  insert into private.contact_rate_limits values(p_actor_hash,v_window,1) on conflict(actor_hash,window_start) do update set hits=private.contact_rate_limits.hits+1 returning hits into v_hits;
  if v_hits > 5 or v_global > 100 then raise exception 'Rate limit exceeded' using errcode='P0001'; end if;
  insert into public.contact_messages(full_name,email,subject,message) values(p_full_name,p_email,p_subject,p_message);
  delete from private.contact_rate_limits where window_start < now()-interval '2 hours';
end; $$;
revoke all on function public.submit_contact(text,text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.submit_contact(text,text,text,text,text) to service_role;

-- Storage remains private. Only assets referenced by published records are public-readable.
create function private.asset_visible(p_path text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.site_settings where profile_image=p_path or og_image=p_path)
  or exists(select 1 from public.projects where is_published and thumbnail=p_path)
  or exists(select 1 from public.project_images i join public.projects p on p.id=i.project_id where p.is_published and i.path=p_path)
  or exists(select 1 from public.certificates where is_published and (image=p_path or file=p_path))
  or exists(select 1 from public.resumes where is_published and file=p_path);
$$;
create function private.asset_referenced(p_path text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.site_settings where profile_image=p_path or og_image=p_path)
  or exists(select 1 from public.projects where thumbnail=p_path)
  or exists(select 1 from public.project_images where path=p_path)
  or exists(select 1 from public.certificates where image=p_path or file=p_path)
  or exists(select 1 from public.resumes where file=p_path);
$$;
revoke all on function private.asset_visible(text),private.asset_referenced(text) from public,anon,authenticated,service_role;
grant execute on function private.asset_visible(text) to anon, authenticated;
grant execute on function private.asset_referenced(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('portfolio','portfolio',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy asset_read on storage.objects for select to anon,authenticated using(bucket_id='portfolio' and (private.is_admin() or private.asset_visible(name)));
create policy asset_insert on storage.objects for insert to authenticated with check(bucket_id='portfolio' and private.is_admin() and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy asset_delete on storage.objects for delete to authenticated using(bucket_id='portfolio' and private.is_admin() and not private.asset_referenced(name));
-- No update policy: replacements use new UUID paths, avoiding stale CDN assets.
