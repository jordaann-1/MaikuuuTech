import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bootstrapSupabaseInterfaces,
  databaseConfigurations,
  runMigrationTransaction,
} from './support/supabase-database';
import { defaultsFor } from '../src/lib/content';
describe.each(databaseConfigurations)('$name', (configuration) => {
  const admin = '11111111-1111-4111-8111-111111111111',
    visitor = '22222222-2222-4222-8222-222222222222';
  const live = '33333333-3333-4333-8333-333333333333',
    draft = '44444444-4444-4444-8444-444444444444';
  let db: PGlite;
  async function role<T>(name: string, id: string, run: () => Promise<T>): Promise<T> {
    await db.exec(`begin; set local role ${name}; set local "request.jwt.claim.sub" = '${id}';`);
    try {
      return await run();
    } finally {
      await db.exec('rollback');
    }
  }
  beforeAll(async () => {
    db = new PGlite();
    await db.waitReady;
    await bootstrapSupabaseInterfaces(db, configuration);
    await runMigrationTransaction(
      db,
      await readFile(
        new URL('../supabase/migrations/202610150001_portfolio.sql', import.meta.url),
        'utf8',
      ),
    );
    await db.exec(`insert into auth.users values('${admin}'),('${visitor}');insert into public.admin_profiles(id,display_name) values('${admin}','Test admin');
    insert into public.projects(id,title,slug,is_published,thumbnail) values('${live}','Published fixture','published-fixture',true,'${admin}/${live}.png'),('${draft}','Draft fixture','draft-fixture',false,'${admin}/${draft}.png');
    insert into public.project_images(project_id,path,alt_text) values('${live}','${admin}/${live}.png','Live screenshot'),('${draft}','${admin}/${draft}.png','Draft screenshot');
    insert into public.project_technologies values('${live}','TypeScript'),('${draft}','Private technology');
    insert into public.contact_messages(full_name,email,subject,message) values('Test visitor','visitor@example.com','Private subject','A private test message.');
    insert into storage.objects(bucket_id,name) values('portfolio','${admin}/${live}.png'),('portfolio','${admin}/${draft}.png'),('portfolio','${admin}/${visitor}.png');`);
  });
  afterAll(async () => {
    await db?.close();
  });
  describe('migration and PostgreSQL RLS integration', () => {
    it('tests the requested defaults without silently restoring automatic exposure', async () => {
      await db.exec(`begin;create table public.review_exposure_probe(id uuid);
        create function public.review_execution_probe() returns boolean language sql as $$select true$$;`);
      try {
        const actual = await db.query(`select
          has_table_privilege('anon','public.review_exposure_probe','select') as anon,
          has_table_privilege('authenticated','public.review_exposure_probe','insert') as authenticated,
          has_table_privilege('service_role','public.review_exposure_probe','select') as service_role,
          has_function_privilege('anon','public.review_execution_probe()','execute') as function_execute,
          (select relrowsecurity from pg_class where oid='public.review_exposure_probe'::regclass) as rls`);
        expect(actual.rows[0]).toEqual({
          anon: configuration.automaticExposure,
          authenticated: configuration.automaticExposure,
          service_role: configuration.automaticExposure,
          function_execute: configuration.automaticExposure,
          rls: configuration.automaticRls,
        });
      } finally {
        await db.exec('rollback');
      }
    });
    it('fixes SECURITY DEFINER search paths for policy and contact helpers', async () => {
      expect(
        (
          await db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname in ('public','private') and p.prosecdef
        and not ('search_path=""'=any(coalesce(p.proconfig,array[]::text[])))`)
        ).rows,
      ).toEqual([]);
    });
    it('opts into only the intended API and helper function execution roles', async () => {
      const functions = [
        ['public.project_categories()', true, true, false],
        ['public.save_project(uuid,jsonb)', false, true, false],
        ['public.submit_contact(text,text,text,text,text)', false, false, true],
        ['private.is_admin()', true, true, true],
        ['private.touch_updated_at()', false, false, false],
        ['private.asset_visible(text)', true, true, false],
        ['private.asset_referenced(text)', false, true, false],
      ] as const;
      for (const [signature, anon, authenticated, service_role] of functions) {
        const actual = await db.query(
          `select has_function_privilege('anon',$1,'execute') as anon,
            has_function_privilege('authenticated',$1,'execute') as authenticated,
            has_function_privilege('service_role',$1,'execute') as service_role`,
          [signature],
        );
        expect(actual.rows[0], signature).toEqual({ anon, authenticated, service_role });
      }
    });
    it('enables RLS on every application table and keeps rate-limit records inaccessible', async () => {
      expect(
        (
          await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`)
        ).rows,
      ).toEqual([]);
      const grants =
        await db.query(`select has_table_privilege('anon','private.contact_rate_limits','select') as anon,
        has_table_privilege('authenticated','private.contact_rate_limits','select') as authenticated`);
      expect(grants.rows[0]).toEqual({ anon: false, authenticated: false });
    });
    it('revokes dangerous inherited table privileges', async () => {
      const { rows } = await db.query(
        "select has_table_privilege('authenticated','public.projects','TRUNCATE') as truncate, has_table_privilege('anon','public.projects','INSERT') as insert",
      );
      expect(rows).toEqual([{ truncate: false, insert: false }]);
    });
    it('returns distinct published categories through the public RPC', async () => {
      await db.query('update public.projects set category=$1 where id=$2', [
        'Private category',
        draft,
      ]);
      await role('anon', '', async () => {
        expect((await db.query('select * from public.project_categories()')).rows).toEqual([
          { category: 'Other' },
        ]);
      });
    });
    it('supports publication and CRUD in all remaining content sections', async () => {
      await role('authenticated', admin, async () => {
        const fixtures: [string, Record<string, unknown>][] = [
          [
            'experiences',
            {
              title: 'Fixture role',
              organization: 'Fixture organization',
              start_date: '2026-01-01',
            },
          ],
          ['education', { title: 'Fixture program', institution: 'Fixture institution' }],
          ['achievements', { title: 'Fixture achievement' }],
          ['services', { title: 'Fixture service' }],
          ['social_links', { label: 'Fixture profile', url: 'https://example.com' }],
          ['resumes', { title: 'Fixture resume', file: `${admin}/${visitor}.pdf` }],
        ];
        for (const [table, values] of fixtures) {
          const columns = Object.keys(values),
            args = Object.values(values);
          const id = (
            await db.query<{ id: string }>(
              `insert into public.${table}(${columns.join(',')}) values(${args.map((_, i) => `$${i + 1}`).join(',')}) returning id`,
              args,
            )
          ).rows[0].id;
          await db.query(`update public.${table} set is_published=true where id=$1`, [id]);
          await db.exec('set local role anon');
          expect(
            (await db.query(`select id from public.${table} where id=$1`, [id])).rows,
          ).toHaveLength(1);
          await db.exec('set local role authenticated');
          await db.query(`update public.${table} set is_published=false where id=$1`, [id]);
          await db.exec('set local role anon');
          expect((await db.query(`select id from public.${table} where id=$1`, [id])).rows).toEqual(
            [],
          );
          await db.exec('set local role authenticated');
          await db.query(`delete from public.${table} where id=$1`, [id]);
        }
      });
    });
    it('runs the complete migration with RLS enabled on every application table', async () => {
      const result = await db.query<{ relname: string }>(
        `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity`,
      );
      expect(result.rows).toEqual([]);
    });
    it('only exposes published projects and their child records', async () => {
      await role('anon', '', async () => {
        expect((await db.query('select id from public.projects')).rows).toEqual([{ id: live }]);
        expect((await db.query('select name from public.project_technologies')).rows).toEqual([
          { name: 'TypeScript' },
        ]);
        expect((await db.query('select project_id from public.project_images')).rows).toEqual([
          { project_id: live },
        ]);
      });
    });
    it('does not expose private messages to anonymous visitors', async () => {
      await expect(
        role('anon', '', () => db.query('select * from public.contact_messages')),
      ).rejects.toThrow(/permission denied/);
    });
    it('does not let public visitors insert messages directly', async () => {
      await expect(
        role('anon', '', () =>
          db.query(
            `insert into public.contact_messages(full_name,email,subject,message) values('Abuser','a@example.com','abuse','Abusive insertion')`,
          ),
        ),
      ).rejects.toThrow(/permission denied/);
    });
    it('distinguishes authenticated users from administrators', async () => {
      await role('authenticated', visitor, async () => {
        expect((await db.query('select * from public.contact_messages')).rows).toEqual([]);
        expect((await db.query('select * from public.admin_profiles')).rows).toEqual([]);
        expect(
          (await db.query('update public.projects set is_published=true returning id')).rows,
        ).toEqual([]);
      });
      await expect(
        role('authenticated', visitor, () =>
          db.query(`insert into public.projects(title,slug) values('Unauthorized','unauthorized')`),
        ),
      ).rejects.toThrow(/row-level security/);
    });
    it('prevents self-promotion to admin', async () => {
      await expect(
        role('authenticated', visitor, () =>
          db.query(
            `insert into public.admin_profiles(id,display_name) values('${visitor}','Fake admin')`,
          ),
        ),
      ).rejects.toThrow(/permission denied/);
    });
    it('supports atomic project create, edit, publish, unpublish, and delete', async () => {
      await role('authenticated', admin, async () => {
        const data = {
          ...defaultsFor('projects'),
          start_date: null,
          completion_date: null,
          title: 'CRUD fixture',
          slug: 'crud-fixture',
          technologies: ['TypeScript'],
          gallery: [
            { path: `${admin}/${visitor}.png`, alt_text: 'Fixture screenshot', sort_order: 0 },
          ],
        };
        const created = await db.query<{ id: string }>(
          'select public.save_project(null,$1::jsonb) as id',
          [JSON.stringify(data)],
        );
        const id = created.rows[0].id;
        expect(
          (await db.query('select * from public.project_images where project_id=$1', [id])).rows,
        ).toHaveLength(1);
        await db.query('select public.save_project($1,$2::jsonb)', [
          id,
          JSON.stringify({ ...data, title: 'Edited fixture', is_published: true }),
        ]);
        await db.exec('set local role anon');
        expect(
          (await db.query('select title from public.projects where id=$1', [id])).rows,
        ).toEqual([{ title: 'Edited fixture' }]);
        await db.exec('set local role authenticated');
        await db.query('select public.save_project($1,$2::jsonb)', [
          id,
          JSON.stringify({ ...data, is_published: false }),
        ]);
        await db.exec('set local role anon');
        expect((await db.query('select id from public.projects where id=$1', [id])).rows).toEqual(
          [],
        );
        await db.exec('set local role authenticated');
        await db.query('delete from public.projects where id=$1', [id]);
        expect(
          (await db.query('select * from public.project_images where project_id=$1', [id])).rows,
        ).toEqual([]);
      });
    });
    it('rolls back project writes if child validation fails', async () => {
      await expect(
        role('authenticated', admin, () =>
          db.query('select public.save_project(null,$1::jsonb)', [
            JSON.stringify({
              ...defaultsFor('projects'),
              start_date: null,
              completion_date: null,
              title: 'Rollback fixture',
              slug: 'rollback-fixture',
              gallery: [{ path: 'path', alt_text: 'x'.repeat(301), sort_order: 0 }],
            }),
          ]),
        ),
      ).rejects.toThrow();
      expect(
        (await db.query("select id from public.projects where slug='rollback-fixture'")).rows,
      ).toEqual([]);
    });
    it('supports skill and certificate CRUD and hides skills in hidden categories', async () => {
      await role('authenticated', admin, async () => {
        const category = (
          await db.query<{ id: string }>(
            "insert into public.skill_categories(name,is_published) values('Test hidden',false) returning id",
          )
        ).rows[0].id;
        const skill = (
          await db.query<{ id: string }>(
            'insert into public.skills(name,category_id,is_published) values($1,$2,true) returning id',
            ['Test skill', category],
          )
        ).rows[0].id;
        await db.exec('set local role anon');
        expect((await db.query('select id from public.skills where id=$1', [skill])).rows).toEqual(
          [],
        );
        await db.exec('set local role authenticated');
        await db.query('update public.skill_categories set is_published=true where id=$1', [
          category,
        ]);
        await db.exec('set local role anon');
        expect(
          (await db.query('select id from public.skills where id=$1', [skill])).rows,
        ).toHaveLength(1);
        await db.exec('set local role authenticated');
        await db.query('update public.skills set name=$1 where id=$2', ['Edited', skill]);
        await db.query('delete from public.skills where id=$1', [skill]);
        const certificate = (
          await db.query<{ id: string }>(
            "insert into public.certificates(title,organization) values('Test certificate','Test issuer') returning id",
          )
        ).rows[0].id;
        await db.query('update public.certificates set is_published=true where id=$1', [
          certificate,
        ]);
        await db.query('delete from public.certificates where id=$1', [certificate]);
      });
    });
    it('allows admin message state and settings updates', async () => {
      await role('authenticated', admin, async () => {
        expect(
          (
            await db.query(
              'update public.contact_messages set is_read=true,is_archived=true returning is_read,is_archived',
            )
          ).rows,
        ).toEqual([{ is_read: true, is_archived: true }]);
        expect(
          (
            await db.query(
              "update public.site_settings set headline='Test headline' returning headline",
            )
          ).rows,
        ).toEqual([{ headline: 'Test headline' }]);
      });
    });
    it('gates media reads and prevents deletion of referenced assets', async () => {
      await role('anon', '', async () => {
        expect((await db.query('select name from storage.objects')).rows).toEqual([
          { name: `${admin}/${live}.png` },
        ]);
      });
      await role('authenticated', admin, async () => {
        expect(
          (
            await db.query('delete from storage.objects where name=$1 returning id', [
              `${admin}/${live}.png`,
            ])
          ).rows,
        ).toEqual([]);
        expect(
          (
            await db.query('delete from storage.objects where name=$1 returning id', [
              `${admin}/${visitor}.png`,
            ])
          ).rows,
        ).toHaveLength(1);
      });
    });
    it('rejects unauthorized uploads and requires admin-scoped paths', async () => {
      await expect(
        role('authenticated', visitor, () =>
          db.query("insert into storage.objects(bucket_id,name) values('portfolio',$1)", [
            `${visitor}/file.png`,
          ]),
        ),
      ).rejects.toThrow(/row-level security/);
      await expect(
        role('authenticated', admin, () =>
          db.query("insert into storage.objects(bucket_id,name) values('portfolio',$1)", [
            `${visitor}/file.png`,
          ]),
        ),
      ).rejects.toThrow(/row-level security/);
      await role('authenticated', admin, async () => {
        await db.query("insert into storage.objects(bucket_id,name) values('portfolio',$1)", [
          `${admin}/file.png`,
        ]);
      });
    });
    it('limits distributed contact submissions transactionally', async () => {
      await role('service_role', '', async () => {
        for (let i = 0; i < 5; i++)
          await db.query('select public.submit_contact($1,$2,$3,$4,$5)', [
            'a'.repeat(64),
            'Test sender',
            'sender@example.com',
            'Test subject',
            'A real test message.',
          ]);
        await expect(
          db.query('select public.submit_contact($1,$2,$3,$4,$5)', [
            'a'.repeat(64),
            'Test sender',
            'sender@example.com',
            'Test subject',
            'A real test message.',
          ]),
        ).rejects.toThrow(/Rate limit/);
      });
    });
    it('prevents authenticated users bypassing the protected contact endpoint', async () => {
      await expect(
        role('authenticated', visitor, () =>
          db.query('select public.submit_contact($1,$2,$3,$4,$5)', [
            'a'.repeat(64),
            'Test sender',
            's@example.com',
            'Test',
            'A real test message.',
          ]),
        ),
      ).rejects.toThrow(/permission denied/);
    });
  });
});
