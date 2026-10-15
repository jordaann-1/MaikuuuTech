import type { PGlite } from '@electric-sql/pglite';

export const databaseConfigurations = [
  { name: 'explicit exposure / automatic RLS', automaticExposure: false, automaticRls: true },
  { name: 'legacy automatic exposure', automaticExposure: true, automaticRls: false },
] as const;

export async function runMigrationTransaction(db: PGlite, sql: string) {
  await db.exec('begin');
  try {
    await db.exec(sql);
    await db.exec('commit');
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}

// Real PostgreSQL ACL/RLS behavior; Supabase-owned Auth/Storage services are stubs.
// This deliberately never loads application environment files or connects remotely.
export async function bootstrapSupabaseInterfaces(
  db: PGlite,
  config: (typeof databaseConfigurations)[number],
) {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    grant usage on schema public to anon,authenticated,service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql as $$
      select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]
    $$;
    grant usage on schema storage to anon,authenticated,service_role;
    grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
    grant execute on function storage.foldername(text) to anon,authenticated,service_role;
  `);
  if (config.automaticExposure) {
    await db.exec(`
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
    `);
  } else {
    await db.exec(`
      -- PostgreSQL's built-in PUBLIC function grant is global: a schema-only
      -- REVOKE cannot remove it. Clear it in this isolated strict-default fixture.
      alter default privileges revoke execute on functions from public;
      alter default privileges in schema public revoke all on tables from public,anon,authenticated,service_role;
      alter default privileges in schema public revoke execute on functions from public,anon,authenticated,service_role;
      alter default privileges in schema public revoke all on sequences from public,anon,authenticated,service_role;
    `);
  }
  if (config.automaticRls) {
    await db.exec(`
      create schema test_support;
      create function test_support.enable_public_rls() returns event_trigger
      language plpgsql security definer set search_path=pg_catalog as $$
      declare command record;
      begin
        for command in select * from pg_event_trigger_ddl_commands()
          where command_tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
            and object_type in ('table','partitioned table')
        loop
          if command.schema_name='public' then
            execute format('alter table %s enable row level security',command.object_identity);
          end if;
        end loop;
      end; $$;
      create event trigger test_automatic_rls on ddl_command_end
      when tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
      execute function test_support.enable_public_rls();
    `);
  }
}
