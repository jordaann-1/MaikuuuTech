import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bootstrapSupabaseInterfaces,
  databaseConfigurations,
  runMigrationTransaction,
} from './support/supabase-database';
describe.each(databaseConfigurations)('$name', (configuration) => {
  let db: PGlite, service: string, budget: string, inquiry: string;
  const admin = '11111111-1111-4111-8111-111111111111',
    visitor = '22222222-2222-4222-8222-222222222222';
  const payload = () => ({
    full_name: 'Test client',
    email: 'fixture@example.com',
    preferred_contact_method: 'Email',
    service_id: service,
    project_title: 'Isolated test request',
    project_description: 'An isolated inquiry for PostgreSQL policy testing.',
    project_type: 'Personal',
    budget_range_id: budget,
    urgency: 'Urgent',
    privacy_consent: true,
  });
  async function reserve(actor = 'a'.repeat(64), nonce = crypto.randomUUID(), extra = {}) {
    return (
      await db.query<{
        value: { id: string; reference: string; state: string; existing: boolean };
      }>('select public.reserve_inquiry($1,$2,$3,$4,$5::jsonb) as value', [
        nonce,
        'MKT-' + crypto.randomUUID().replaceAll('-', '').toUpperCase(),
        'b'.repeat(64),
        actor,
        JSON.stringify({ ...payload(), ...extra }),
      ])
    ).rows[0].value;
  }
  async function role<T>(name: string, id: string, run: () => Promise<T>) {
    await db.exec(`begin;set local role ${name};set local "request.jwt.claim.sub"='${id}';`);
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
    await db.exec(
      `insert into public.contact_messages(full_name,email,subject,message) values('Original client','original@example.com','Original message','This preexisting message must be preserved.');insert into public.services(title) values('Preexisting custom service');`,
    );
    await runMigrationTransaction(
      db,
      await readFile(
        new URL('../supabase/migrations/202610150002_client_inquiries.sql', import.meta.url),
        'utf8',
      ),
    );
    await db.exec(
      `insert into auth.users values('${admin}'),('${visitor}');insert into public.admin_profiles(id,display_name) values('${admin}','Fixture admin');`,
    );
    service = (
      await db.query<{ id: string }>(
        "select id from public.services where slug='website-development'",
      )
    ).rows[0].id;
    budget = (
      await db.query<{ id: string }>(
        'select id from public.inquiry_budget_ranges order by sort_order limit 1',
      )
    ).rows[0].id;
    inquiry = (await reserve()).id;
    await db.query('select public.complete_inquiry($1,$2::jsonb)', [
      inquiry,
      JSON.stringify([
        {
          storage_path: inquiry + '/' + crypto.randomUUID() + '.pdf',
          original_filename: 'requirements.pdf',
          mime_type: 'application/pdf',
          file_size: 100,
        },
      ]),
    ]);
  });
  afterAll(async () => {
    await db?.close();
  });
  describe('inquiry migration and real PostgreSQL RLS, with Supabase-owned interfaces stubbed', () => {
    it('restricts summary and trigger execution independently of inherited defaults', async () => {
      expect(
        (
          await db.query(`select has_function_privilege('anon','public.inquiry_summary()','execute') as anon,
        has_function_privilege('authenticated','public.inquiry_summary()','execute') as authenticated,
        has_function_privilege('service_role','public.inquiry_summary()','execute') as service_role`)
        ).rows[0],
      ).toEqual({ anon: false, authenticated: true, service_role: false });
      expect(
        (
          await db.query(`select has_function_privilege('anon','private.log_inquiry_activity()','execute') as anon,
        has_function_privilege('authenticated','private.log_inquiry_activity()','execute') as authenticated,
        has_function_privilege('service_role','private.log_inquiry_activity()','execute') as service_role`)
        ).rows[0],
      ).toEqual({ anon: false, authenticated: false, service_role: false });
    });
    it('keeps RLS enabled on all application tables after both migrations', async () => {
      expect(
        (
          await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`)
        ).rows,
      ).toEqual([]);
    });
    it('upgrades existing content without deleting original messages or services', async () => {
      expect((await db.query('select * from public.contact_messages')).rows).toHaveLength(1);
      expect(
        (
          await db.query(
            "select slug from public.services where title='Preexisting custom service'",
          )
        ).rows,
      ).toHaveLength(1);
      expect((await db.query('select * from public.services')).rows).toHaveLength(23);
    });
    it('keeps private inquiries and attachments unreadable to public and nonadmin users', async () => {
      await role('anon', '', async () => {
        await expect(db.query('select * from public.service_inquiries')).rejects.toThrow(
          /permission denied/i,
        );
      });
      await role('authenticated', visitor, async () => {
        for (const table of ['service_inquiries', 'inquiry_activity', 'inquiry_attachments'])
          expect((await db.query('select * from public.' + table)).rows).toEqual([]);
        expect(
          (await db.query("update public.service_inquiries set status='Completed' returning id"))
            .rows,
        ).toEqual([]);
      });
    });
    it('restricts submission RPCs to the trusted server role', async () => {
      expect(
        (
          await db.query(
            "select has_function_privilege('anon','public.reserve_inquiry(uuid,text,text,text,jsonb)','execute') as anon,has_function_privilege('authenticated','public.complete_inquiry(uuid,jsonb)','execute') as authenticated,has_function_privilege('service_role','public.reserve_inquiry(uuid,text,text,text,jsonb)','execute') as server",
          )
        ).rows[0],
      ).toEqual({ anon: false, authenticated: false, server: true });
    });
    it('stores complete inquiries, file associations, snapshots, consent and creation activity', async () => {
      const row = (
        await db.query<Record<string, unknown>>(
          'select * from public.service_inquiries where id=$1',
          [inquiry],
        )
      ).rows[0];
      expect(row).toMatchObject({
        submission_state: 'complete',
        status: 'New',
        priority: 'Normal',
        urgency: 'Urgent',
        service_name_snapshot: 'Website Development',
        budget_range: 'Not sure yet',
      });
      expect(row.privacy_consent_at).toBeTruthy();
      expect((await db.query('select inquiry_id from public.inquiry_attachments')).rows).toEqual([
        { inquiry_id: inquiry },
      ]);
      expect((await db.query('select action from public.inquiry_activity')).rows).toEqual([
        { action: 'Inquiry created' },
      ]);
    });
    it('preserves historical service information after rename, deactivation and deletion', async () => {
      await role('authenticated', admin, async () => {
        await db.query(
          "update public.services set title='Renamed service',is_published=false where id=$1",
          [service],
        );
        await db.query('delete from public.services where id=$1', [service]);
        expect(
          (
            await db.query(
              'select service_id,service_name_snapshot from public.service_inquiries where id=$1',
              [inquiry],
            )
          ).rows[0],
        ).toEqual({ service_id: null, service_name_snapshot: 'Website Development' });
      });
    });
    it('allows only active, unarchived services in active categories in public selections', async () => {
      await role('authenticated', admin, async () => {
        await db.query('update public.services set is_archived=true where id=$1', [service]);
        await db.exec('set local role anon');
        expect(
          (await db.query('select id from public.services where id=$1', [service])).rows,
        ).toEqual([]);
      });
      await role('authenticated', admin, async () => {
        await db.query(
          'update public.service_categories set is_published=false where id=(select category_id from public.services where id=$1)',
          [service],
        );
        await db.exec('set local role anon');
        expect(
          (await db.query('select id from public.services where id=$1', [service])).rows,
        ).toEqual([]);
      });
    });
    it('rejects invalid services, inactive budgets, missing consent and past deadlines', async () => {
      for (const extra of [
        { service_id: crypto.randomUUID() },
        { preferred_deadline: '2000-01-01' },
        { privacy_consent: false },
      ])
        await expect(reserve(undefined, undefined, extra)).rejects.toThrow();
      await role('authenticated', admin, async () => {
        await db.query('update public.inquiry_budget_ranges set is_published=false where id=$1', [
          budget,
        ]);
        await db.exec('set local role service_role');
        await expect(reserve()).rejects.toThrow(/Budget unavailable/);
      });
    });
    it('returns the same reference for a matching retry and rejects a conflicting actor', async () => {
      await role('service_role', '', async () => {
        const nonce = crypto.randomUUID(),
          one = await reserve('c'.repeat(64), nonce),
          two = await reserve('c'.repeat(64), nonce);
        expect(two).toMatchObject({ id: one.id, reference: one.reference, existing: true });
        await expect(reserve('d'.repeat(64), nonce)).rejects.toThrow(/Submission conflict/);
      });
    });
    it('enforces persistent hourly quotas transactionally', async () => {
      await role('service_role', '', async () => {
        for (let n = 0; n < 5; n++) await reserve('e'.repeat(64));
        await expect(reserve('e'.repeat(64))).rejects.toThrow(/Rate limit/);
      });
    });
    it('rejects attachments belonging to another inquiry', async () => {
      await role('service_role', '', async () => {
        const row = await reserve('f'.repeat(64));
        await expect(
          db.query('select public.complete_inquiry($1,$2::jsonb)', [
            row.id,
            JSON.stringify([
              {
                storage_path: crypto.randomUUID() + '/' + crypto.randomUUID() + '.pdf',
                original_filename: 'x.pdf',
                mime_type: 'application/pdf',
                file_size: 10,
              },
            ]),
          ]),
        ).rejects.toThrow();
      });
    });
    it('saves status, priority, private notes and archive audit with administrator identity', async () => {
      await role('authenticated', admin, async () => {
        await db.query(
          "update public.service_inquiries set status='In Progress',priority='High',admin_notes='Private fixture notes',is_archived=true where id=$1",
          [inquiry],
        );
        expect(
          (
            await db.query(
              'select status,priority,admin_notes from public.service_inquiries where id=$1',
              [inquiry],
            )
          ).rows[0],
        ).toMatchObject({
          status: 'In Progress',
          priority: 'High',
          admin_notes: 'Private fixture notes',
        });
        const rows = (
          await db.query<{ actor_name: string }>(
            'select action,actor_name from public.inquiry_activity where actor_id=$1',
            [admin],
          )
        ).rows;
        expect(rows).toHaveLength(4);
        expect(rows.every((row) => row.actor_name === 'Fixture admin')).toBe(true);
      });
    });
    it('exposes real statistics only to administrators', async () => {
      await role('authenticated', admin, async () => {
        expect(
          (
            await db.query<{ value: { counts: Record<string, number> } }>(
              'select public.inquiry_summary() as value',
            )
          ).rows[0].value.counts,
        ).toMatchObject({ total: 1, new: 1, unread: 1, in_progress: 0 });
      });
      await role('authenticated', visitor, async () => {
        await expect(db.query('select public.inquiry_summary()')).rejects.toThrow();
      });
    });
    it('keeps inquiry storage private and blocks direct public uploads and downloads', async () => {
      expect(
        (await db.query("select public from storage.buckets where id='inquiry-attachments'")).rows,
      ).toEqual([{ public: false }]);
      await db.query(
        "insert into storage.objects(bucket_id,name) values('inquiry-attachments',$1)",
        [inquiry + '/' + crypto.randomUUID() + '.pdf'],
      );
      await role('anon', '', async () => {
        expect(
          (await db.query("select * from storage.objects where bucket_id='inquiry-attachments'"))
            .rows,
        ).toEqual([]);
        await expect(
          db.query(
            "insert into storage.objects(bucket_id,name) values('inquiry-attachments','forged.pdf')",
          ),
        ).rejects.toThrow();
      });
      await role('authenticated', visitor, async () =>
        expect(
          (await db.query("select * from storage.objects where bucket_id='inquiry-attachments'"))
            .rows,
        ).toEqual([]),
      );
      await role('authenticated', admin, async () =>
        expect(
          (await db.query("select * from storage.objects where bucket_id='inquiry-attachments'"))
            .rows,
        ).toHaveLength(1),
      );
    });
    it('publishes newly created services through the same public catalog without rebuilding', async () => {
      await role('authenticated', admin, async () => {
        const row = (
          await db.query<{ id: string }>(
            "insert into public.services(title,slug,is_published) values('New fixture service','new-fixture-service',true) returning id",
          )
        ).rows[0];
        await db.exec('set local role anon');
        expect(
          (await db.query('select title from public.services where id=$1', [row.id])).rows,
        ).toEqual([{ title: 'New fixture service' }]);
      });
    });
    it('supports administrator category CRUD while rejecting nonadmin writes', async () => {
      await role('authenticated', admin, async () => {
        const row = (
          await db.query<{ id: string }>(
            "insert into public.service_categories(name,slug) values('Fixture category','fixture-category') returning id",
          )
        ).rows[0];
        await db.query(
          "update public.service_categories set description='Updated fixture' where id=$1",
          [row.id],
        );
        await db.query('delete from public.service_categories where id=$1', [row.id]);
      });
      await role('authenticated', visitor, async () => {
        await expect(
          db.query("insert into public.service_categories(name,slug) values('Forged','forged')"),
        ).rejects.toThrow();
      });
    });
  });
});
