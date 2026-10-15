-- Additive upgrade: existing portfolio content and contact_messages are preserved.
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check(length(name) between 1 and 100),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check(length(description)<=3000),
  sort_order integer not null default 0, is_published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.inquiry_budget_ranges (
  id uuid primary key default gen_random_uuid(), label text not null unique check(length(label) between 1 and 100),
  sort_order integer not null default 0, is_published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.services add column category_id uuid references public.service_categories(id) on delete set null;
alter table public.services add column slug text;
update public.services set slug=trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g'))||'-'||replace(id::text,'-','');
alter table public.services alter column slug set default gen_random_uuid()::text;
alter table public.services alter column slug set not null;
alter table public.services add constraint services_slug_unique unique(slug);
alter table public.services add constraint services_slug_valid check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=200);
alter table public.services add column starting_price numeric(12,2) check(starting_price is null or starting_price>=0);
alter table public.services add column is_featured boolean not null default false;
alter table public.services add column is_archived boolean not null default false;
drop policy published_read on public.services;
create policy service_public on public.services for select to anon,authenticated using(is_published and not is_archived and (category_id is null or exists(select 1 from public.service_categories c where c.id=category_id and c.is_published)));

do $$ declare t text; begin
 foreach t in array array['service_categories','inquiry_budget_ranges'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to anon',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated,service_role',t);
  execute format('create policy catalog_public on public.%I for select to anon,authenticated using(is_published)',t);
  execute format('create policy catalog_admin on public.%I for all to authenticated using((select private.is_admin())) with check((select private.is_admin()))',t);
  execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated_at()',t);
 end loop;
end $$;
insert into public.service_categories(name,slug,sort_order) values
 ('Learning & Consultation','learning-consultation',0),('Web & Applications','web-applications',1),('Systems & Data','systems-data',2),('Connected Technology','connected-technology',3),('Support & Delivery','support-delivery',4);
insert into public.inquiry_budget_ranges(label,sort_order) values
 ('Not sure yet',0),('Below ₱1,000',1),('₱1,000–₱5,000',2),('₱5,001–₱10,000',3),('₱10,001–₱25,000',4),('₱25,001–₱50,000',5),('Above ₱50,000',6),('Prefer to discuss',7);
with catalog(title,slug,description,category,position) as (values
 ('Capstone System Development Consultation','capstone-consultation','Mentoring, planning, code review, and guided problem-solving. Students remain the authors of their own work.','learning-consultation',0),
 ('School Project Programming Assistance','school-project-tutoring','Legitimate tutoring, debugging, and guided development to help students understand and produce their own work. No impersonation or work submitted as someone else''s.','learning-consultation',1),
 ('Website Development','website-development','Discuss a website tailored to your requirements.','web-applications',2),
 ('Web Application Development','web-application-development','Plan and develop a web application around your workflow.','web-applications',3),
 ('Mobile Application Development','mobile-application-development','Explore a mobile application for your needs.','web-applications',4),
 ('Desktop Application Development','desktop-application-development','Discuss a desktop application and its requirements.','web-applications',5),
 ('Database Design & Development','database-development','Data modeling, database design, and implementation.','systems-data',6),
 ('UI/UX Design','ui-ux-design','User flows, interface design, and usability improvements.','web-applications',7),
 ('System Debugging & Bug Fixing','system-debugging','Investigate defects and discuss practical fixes.','support-delivery',8),
 ('Existing System Maintenance','system-maintenance','Maintain and improve an existing system.','support-delivery',9),
 ('API Development & Integration','api-integration','Design APIs and connect systems.','systems-data',10),
 ('IoT / Arduino / ESP32 Development','iot-development','Discuss connected devices, prototypes, and integrations.','connected-technology',11),
 ('System Deployment & Hosting','deployment-hosting','Deployment planning, configuration, and hosting guidance.','support-delivery',12),
 ('IT Consultation','it-consultation','A conversation about technical requirements and possible approaches.','learning-consultation',13),
 ('Portfolio Website Development','portfolio-development','A personal portfolio built around your work.','web-applications',14),
 ('E-Commerce Website Development','e-commerce-development','Discuss product catalogs, shopping flows, and integrations.','web-applications',15),
 ('Business Management Systems','business-management','Software to support a business workflow.','systems-data',16),
 ('Inventory Management Systems','inventory-management','Discuss inventory tracking and operational needs.','systems-data',17),
 ('Billing & Payment System Development','billing-payments','Discuss billing workflows and payment-provider integration.','systems-data',18),
 ('Booking & Reservation Systems','booking-reservations','Plan booking, scheduling, and reservation workflows.','systems-data',19),
 ('System Documentation & Technical Guidance','documentation-guidance','Documentation support, explanation, and technical mentoring.','learning-consultation',20),
 ('Other IT-Related Services','other-it-services','Tell me about your requirements so we can discuss a suitable approach.','support-delivery',21)
)
insert into public.services(title,slug,description,category_id,sort_order,is_published)
select x.title,x.slug,x.description,c.id,x.position,true from catalog x join public.service_categories c on c.slug=x.category
where not exists(select 1 from public.services s where s.slug=x.slug or lower(s.title)=lower(x.title));

create table public.service_inquiries (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null unique,
 public_reference text not null unique check(public_reference ~ '^MKT-[A-F0-9]{32}$'),
 request_fingerprint text not null check(request_fingerprint ~ '^[a-f0-9]{64}$'),
 actor_hash text not null check(length(actor_hash)=64),
 submission_state text not null default 'uploading' check(submission_state in ('uploading','complete')),
 full_name text not null check(length(full_name) between 2 and 100), email text not null check(length(email) between 3 and 254),
 phone text not null default '' check(length(phone)<=32),
 preferred_contact_method text not null check(preferred_contact_method in ('Email','Phone','Messenger','Other')),
 external_contact text not null default '' check(length(external_contact)<=500),
 service_id uuid references public.services(id) on delete set null,
 service_name_snapshot text not null check(length(service_name_snapshot) between 1 and 160),
 project_title text not null check(length(project_title) between 3 and 180),
 project_description text not null check(length(project_description) between 20 and 10000),
 required_features text not null default '' check(length(required_features)<=5000),
 project_type text not null check(project_type in ('Personal','Academic','Business','Organization','Other')),
 budget_range_id uuid references public.inquiry_budget_ranges(id) on delete set null,
 budget_range text not null check(length(budget_range) between 1 and 100),
 preferred_deadline date, urgency text not null default 'Normal' check(urgency in ('Flexible','Normal','Urgent')),
 additional_notes text not null default '' check(length(additional_notes)<=3000),
 status text not null default 'New' check(status in ('New','Under Review','Contacted','Awaiting Client','Accepted','In Progress','Completed','Declined','Cancelled')),
 priority text not null default 'Normal' check(priority in ('Low','Normal','High','Urgent')),
 admin_notes text not null default '' check(length(admin_notes)<=10000),
 is_read boolean not null default false, is_archived boolean not null default false,
 privacy_consent_at timestamptz not null default now(), privacy_notice_version text not null default '2026-10-15',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index inquiries_recent on public.service_inquiries(created_at desc) where submission_state='complete';
create index inquiries_status_priority on public.service_inquiries(status,priority,created_at desc) where submission_state='complete' and not is_archived;
create index inquiries_service on public.service_inquiries(service_id,created_at desc);
create index inquiries_unread on public.service_inquiries(created_at desc) where submission_state='complete' and not is_read and not is_archived;
create table public.inquiry_attachments (
 id uuid primary key default gen_random_uuid(), inquiry_id uuid not null references public.service_inquiries(id) on delete cascade,
 storage_path text not null unique check(storage_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp|pdf|txt|docx)$'),
 original_filename text not null check(length(original_filename) between 1 and 180),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
 file_size integer not null check(file_size between 1 and 5242880),
 created_at timestamptz not null default now()
);
create index inquiry_attachment_parent on public.inquiry_attachments(inquiry_id);
create table public.inquiry_activity (
 id uuid primary key default gen_random_uuid(), inquiry_id uuid not null references public.service_inquiries(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, actor_name text not null default '',
 action text not null, previous_status text, new_status text,
 created_at timestamptz not null default now()
);
create index inquiry_activity_parent on public.inquiry_activity(inquiry_id,created_at desc);
do $$ declare t text; begin
 foreach t in array array['service_inquiries','inquiry_attachments','inquiry_activity'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
  execute format('create policy inquiry_admin_read on public.%I for select to authenticated using((select private.is_admin()))',t);
 end loop;
end $$;
grant update,delete on public.service_inquiries to authenticated;
create policy inquiry_admin_update on public.service_inquiries for update to authenticated using((select private.is_admin()) and submission_state='complete') with check((select private.is_admin()));
create policy inquiry_admin_delete on public.service_inquiries for delete to authenticated using((select private.is_admin()));
create trigger touch_updated before update on public.service_inquiries for each row execute function private.touch_updated_at();

create function private.log_inquiry_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_name text;
begin
 select display_name into v_name from public.admin_profiles where id=v_actor;
 if new.submission_state<>'complete' then return new; end if;
 if old.submission_state<>'complete' then
  insert into public.inquiry_activity(inquiry_id,action,new_status) values(new.id,'Inquiry created',new.status);
 else
  if new.status is distinct from old.status then insert into public.inquiry_activity(inquiry_id,actor_id,actor_name,action,previous_status,new_status) values(new.id,v_actor,coalesce(v_name,''),'Status changed',old.status,new.status); end if;
  if new.priority is distinct from old.priority then insert into public.inquiry_activity(inquiry_id,actor_id,actor_name,action,previous_status,new_status) values(new.id,v_actor,coalesce(v_name,''),'Priority changed',old.priority,new.priority); end if;
  if new.admin_notes is distinct from old.admin_notes then insert into public.inquiry_activity(inquiry_id,actor_id,actor_name,action) values(new.id,v_actor,coalesce(v_name,''),'Internal notes updated'); end if;
  if new.is_archived is distinct from old.is_archived then insert into public.inquiry_activity(inquiry_id,actor_id,actor_name,action) values(new.id,v_actor,coalesce(v_name,''),case when new.is_archived then 'Inquiry archived' else 'Inquiry restored' end); end if;
 end if;
 return new;
end; $$;
revoke all on function private.log_inquiry_activity() from public,anon,authenticated,service_role;
create trigger inquiry_activity_log after update on public.service_inquiries for each row execute function private.log_inquiry_activity();

create function public.reserve_inquiry(p_submission_id uuid,p_reference text,p_fingerprint text,p_actor_hash text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.service_inquiries; v_service text; v_budget text; v_hits integer; v_global integer; v_window timestamptz:=date_trunc('hour',now());
begin
 select * into v_row from public.service_inquiries where submission_id=p_submission_id for update;
 if found then
  if v_row.request_fingerprint<>p_fingerprint or v_row.actor_hash<>p_actor_hash then raise exception 'Submission conflict' using errcode='23505'; end if;
  return jsonb_build_object('id',v_row.id,'reference',v_row.public_reference,'state',v_row.submission_state,'existing',true);
 end if;
 select s.title into v_service from public.services s where s.id=(p_data->>'service_id')::uuid and s.is_published and not s.is_archived and (s.category_id is null or exists(select 1 from public.service_categories c where c.id=s.category_id and c.is_published)) for share;
 if v_service is null then raise exception 'Service unavailable' using errcode='22023'; end if;
 select label into v_budget from public.inquiry_budget_ranges where id=(p_data->>'budget_range_id')::uuid and is_published for share;
 if v_budget is null then raise exception 'Budget unavailable' using errcode='22023'; end if;
 if nullif(p_data->>'preferred_deadline','')::date < (now() at time zone 'Asia/Manila')::date then raise exception 'Invalid deadline' using errcode='22023'; end if;
 if coalesce((p_data->>'privacy_consent')::boolean,false) is not true then raise exception 'Consent required' using errcode='22023'; end if;
 insert into private.contact_rate_limits values('global',v_window,1) on conflict(actor_hash,window_start) do update set hits=private.contact_rate_limits.hits+1 returning hits into v_global;
 insert into private.contact_rate_limits values(p_actor_hash,v_window,1) on conflict(actor_hash,window_start) do update set hits=private.contact_rate_limits.hits+1 returning hits into v_hits;
 if v_hits>5 or v_global>100 then raise exception 'Rate limit exceeded' using errcode='P0001'; end if;
 insert into public.service_inquiries(submission_id,public_reference,request_fingerprint,actor_hash,full_name,email,phone,preferred_contact_method,external_contact,service_id,service_name_snapshot,project_title,project_description,required_features,project_type,budget_range_id,budget_range,preferred_deadline,urgency,additional_notes)
 values(p_submission_id,p_reference,p_fingerprint,p_actor_hash,p_data->>'full_name',p_data->>'email',coalesce(p_data->>'phone',''),p_data->>'preferred_contact_method',coalesce(p_data->>'external_contact',''),(p_data->>'service_id')::uuid,v_service,p_data->>'project_title',p_data->>'project_description',coalesce(p_data->>'required_features',''),p_data->>'project_type',(p_data->>'budget_range_id')::uuid,v_budget,nullif(p_data->>'preferred_deadline','')::date,p_data->>'urgency',coalesce(p_data->>'additional_notes','')) returning * into v_row;
 delete from private.contact_rate_limits where window_start<now()-interval '2 hours';
 return jsonb_build_object('id',v_row.id,'reference',v_row.public_reference,'state','uploading','existing',false);
end; $$;
revoke all on function public.reserve_inquiry(uuid,text,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.reserve_inquiry(uuid,text,text,text,jsonb) to service_role;
create function public.complete_inquiry(p_id uuid,p_attachments jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v_file jsonb; v_state text;
begin
 select submission_state into v_state from public.service_inquiries where id=p_id for update;
 if v_state is null then raise no_data_found; end if;
 if v_state='complete' then return; end if;
 if jsonb_typeof(p_attachments)<>'array' or jsonb_array_length(p_attachments)>3 then raise invalid_parameter_value; end if;
 for v_file in select value from jsonb_array_elements(p_attachments) loop
  if split_part(v_file->>'storage_path','/',1)<>p_id::text then raise insufficient_privilege; end if;
  insert into public.inquiry_attachments(inquiry_id,storage_path,original_filename,mime_type,file_size) values(p_id,v_file->>'storage_path',v_file->>'original_filename',v_file->>'mime_type',(v_file->>'file_size')::integer);
 end loop;
 update public.service_inquiries set submission_state='complete' where id=p_id;
end; $$;
revoke all on function public.complete_inquiry(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.complete_inquiry(uuid,jsonb) to service_role;
create function public.inquiry_summary() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_counts jsonb; v_recent jsonb;
begin
 if not private.is_admin() then raise insufficient_privilege; end if;
 select jsonb_build_object('total',count(*),'new',count(*) filter(where status='New' and not is_archived),'in_progress',count(*) filter(where status='In Progress' and not is_archived),'awaiting_client',count(*) filter(where status='Awaiting Client' and not is_archived),'completed',count(*) filter(where status='Completed'),'declined',count(*) filter(where status='Declined'),'unread',count(*) filter(where not is_read and not is_archived)) into v_counts from public.service_inquiries where submission_state='complete';
 select coalesce(jsonb_agg(row_to_json(r)),'[]'::jsonb) into v_recent from (select id,public_reference,full_name,project_title,service_name_snapshot,status,is_read,created_at from public.service_inquiries where submission_state='complete' and not is_archived order by created_at desc limit 5) r;
 return jsonb_build_object('counts',v_counts,'recent',v_recent);
end; $$;
revoke all on function public.inquiry_summary() from public,anon,authenticated,service_role;
grant execute on function public.inquiry_summary() to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('inquiry-attachments','inquiry-attachments',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
create policy inquiry_file_read on storage.objects for select to authenticated using(bucket_id='inquiry-attachments' and private.is_admin());
create policy inquiry_file_delete on storage.objects for delete to authenticated using(bucket_id='inquiry-attachments' and private.is_admin());
-- Public clients cannot upload directly, list, read, or delete client documents.
