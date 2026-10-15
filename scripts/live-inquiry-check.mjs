// Explicit opt-in only. Use a dedicated Supabase test project, never production.
import { createClient } from '@supabase/supabase-js';
try {
  process.loadEnvFile('.env.local');
} catch {
  /* Optional environment file. */
}
const env = process.env,
  required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'TEST_ADMIN_EMAIL',
    'TEST_ADMIN_PASSWORD',
  ];
const missing = required.filter((key) => !env[key] || env[key].startsWith('YOUR_'));
if (missing.length || env.TEST_ALLOW_WRITES !== 'true') {
  console.error(
    'BLOCKED: Live inquiry tests require a dedicated migrated Supabase test project, ' +
      (missing.join(', ') || 'test credentials') +
      ' and TEST_ALLOW_WRITES=true.',
  );
  process.exitCode = 2;
} else {
  const options = { auth: { persistSession: false, autoRefreshToken: false } },
    db = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      options,
    ),
    anon = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      options,
    ),
    server = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, options),
    marker = 'inquiry-test-' + crypto.randomUUID();
  const cleanup = [];
  let inquiryId, path;
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    console.log('PASS: ' + label);
  };
  try {
    const login = await db.auth.signInWithPassword({
      email: env.TEST_ADMIN_EMAIL,
      password: env.TEST_ADMIN_PASSWORD,
    });
    check(!login.error, 'Real administrator login');
    check(
      !!(await db.from('admin_profiles').select('id').eq('id', login.data.user.id).single()).data,
      'Trusted membership',
    );
    const category = await db
      .from('service_categories')
      .insert({ name: marker, slug: marker, is_published: true })
      .select('id')
      .single();
    check(!category.error, 'Service category create');
    cleanup.push(['service_categories', category.data.id]);
    const budget = await db
      .from('inquiry_budget_ranges')
      .insert({ label: marker, is_published: true })
      .select('id')
      .single();
    check(!budget.error, 'Budget option create');
    cleanup.push(['inquiry_budget_ranges', budget.data.id]);
    const service = await db
      .from('services')
      .insert({ title: marker, slug: marker, category_id: category.data.id, is_published: true })
      .select('id')
      .single();
    check(!service.error, 'Service create');
    cleanup.push(['services', service.data.id]);
    check(
      (await anon.from('services').select('id').eq('id', service.data.id)).data?.length === 1,
      'Active service publicly selectable',
    );
    const payload = {
        full_name: 'Isolated test client',
        email: 'fixture@example.com',
        preferred_contact_method: 'Email',
        service_id: service.data.id,
        project_title: marker,
        project_description:
          'An explicitly isolated live integration fixture, deleted after this test.',
        project_type: 'Personal',
        budget_range_id: budget.data.id,
        urgency: 'Normal',
        privacy_consent: true,
      },
      nonce = crypto.randomUUID(),
      reference = 'MKT-' + crypto.randomUUID().replaceAll('-', '').toUpperCase(),
      args = {
        p_submission_id: nonce,
        p_reference: reference,
        p_fingerprint: 'b'.repeat(64),
        p_actor_hash:
          crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''),
        p_data: payload,
      };
    const reserved = await server.rpc('reserve_inquiry', args);
    check(!reserved.error && !!reserved.data?.id, 'Real inquiry reservation');
    inquiryId = reserved.data.id;
    const retry = await server.rpc('reserve_inquiry', args);
    check(
      retry.data?.reference === reference && retry.data?.existing === true,
      'Idempotent reservation',
    );
    path = inquiryId + '/' + crypto.randomUUID() + '.pdf';
    const bytes = new TextEncoder().encode('%PDF-1.4\n% Isolated integration fixture\n%%EOF');
    check(
      !(
        await server.storage
          .from('inquiry-attachments')
          .upload(path, bytes, { contentType: 'application/pdf' })
      ).error,
      'Private supporting-document upload',
    );
    check(
      !(
        await server.rpc('complete_inquiry', {
          p_id: inquiryId,
          p_attachments: [
            {
              storage_path: path,
              original_filename: 'integration-fixture.pdf',
              mime_type: 'application/pdf',
              file_size: bytes.length,
            },
          ],
        })
      ).error,
      'Inquiry completion with attachment',
    );
    check(
      !!(await anon.from('service_inquiries').select('*')).error,
      'Anonymous inquiry reads denied',
    );
    check(
      !!(await anon.storage.from('inquiry-attachments').createSignedUrl(path, 60)).error,
      'Anonymous signed downloads denied',
    );
    const row = await db
      .from('service_inquiries')
      .select('status,service_name_snapshot,admin_notes')
      .eq('id', inquiryId)
      .single();
    check(
      !row.error && row.data.service_name_snapshot === marker,
      'Administrator reads persisted snapshot',
    );
    check(
      !(
        await db
          .from('service_inquiries')
          .update({
            status: 'In Progress',
            priority: 'High',
            admin_notes: 'Private integration fixture note',
            is_read: true,
          })
          .eq('id', inquiryId)
      ).error,
      'Administrator status/priority/notes update',
    );
    const activity = await db
      .from('inquiry_activity')
      .select('action,actor_id')
      .eq('inquiry_id', inquiryId);
    check(
      activity.data?.some(
        (item) => item.action === 'Status changed' && item.actor_id === login.data.user.id,
      ),
      'Activity identity recorded',
    );
    const signed = await db.storage
      .from('inquiry-attachments')
      .createSignedUrl(path, 60, { download: 'integration-fixture.pdf' });
    check(!signed.error, 'Authorized signed download');
    const downloaded = await fetch(signed.data.signedUrl);
    check(
      downloaded.ok && (await downloaded.arrayBuffer()).byteLength === bytes.length,
      'Storage download content',
    );
    check(
      !(await db.from('services').update({ is_archived: true }).eq('id', service.data.id)).error,
      'Service archive',
    );
    check(
      !(await anon.from('services').select('id').eq('id', service.data.id)).data?.length,
      'Archived service excluded',
    );
    check(!(await db.from('services').delete().eq('id', service.data.id)).error, 'Service delete');
    check(
      (
        await db
          .from('service_inquiries')
          .select('service_id,service_name_snapshot')
          .eq('id', inquiryId)
          .single()
      ).data?.service_name_snapshot === marker,
      'Historical snapshot retained after deletion',
    );
    console.log(
      'NOT TESTED: Real Turnstile HTTP form submission, nonadmin account, browser cookies, signed-link expiry, worst-case Worker upload limits. Complete manual live acceptance before release.',
    );
  } catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
  } finally {
    let storageClean = true;
    if (path) {
      const removed = await server.storage.from('inquiry-attachments').remove([path]);
      storageClean = !removed.error;
      if (!storageClean) {
        console.error(
          'FAIL: Test attachment cleanup failed; inquiry reference retained for cleanup.',
        );
        process.exitCode = 1;
      }
    }
    if (inquiryId && storageClean) {
      const removed = await server.from('service_inquiries').delete().eq('id', inquiryId);
      if (removed.error) {
        console.error('FAIL: Test inquiry cleanup failed.');
        process.exitCode = 1;
      }
    }
    for (const [table, id] of cleanup.reverse()) {
      if ((await db.from(table).delete().eq('id', id)).error) {
        console.error('FAIL: Test catalog cleanup failed.');
        process.exitCode = 1;
      }
    }
    await db.auth.signOut();
  }
}
