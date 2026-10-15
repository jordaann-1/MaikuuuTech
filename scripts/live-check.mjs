import { createClient } from '@supabase/supabase-js';
try {
  process.loadEnvFile('.env.local');
} catch {
  /* Optional local configuration. */
}
const env = process.env;
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'TEST_ADMIN_EMAIL',
  'TEST_ADMIN_PASSWORD',
];
const missing = required.filter((key) => !env[key] || env[key].startsWith('YOUR_'));
if (missing.length || env.TEST_ALLOW_WRITES !== 'true') {
  console.error(
    `BLOCKED: Live Supabase tests require ${missing.join(', ') || 'a dedicated test project'} and TEST_ALLOW_WRITES=true. Use a test Supabase project; these checks create and remove test content.`,
  );
  process.exitCode = 2;
} else {
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    options,
  );
  const anon = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    options,
  );
  const marker = `integration-${crypto.randomUUID()}`;
  let projectId;
  const cleanup = [];
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    console.log(`PASS: ${label}`);
  };
  try {
    const invalid = await anon.auth.signInWithPassword({
      email: env.TEST_ADMIN_EMAIL,
      password: crypto.randomUUID(),
    });
    check(!!invalid.error, 'Invalid credentials rejected');
    const login = await db.auth.signInWithPassword({
      email: env.TEST_ADMIN_EMAIL,
      password: env.TEST_ADMIN_PASSWORD,
    });
    check(!login.error, 'Administrator login');
    const profile = await db
      .from('admin_profiles')
      .select('id')
      .eq('id', login.data.user.id)
      .single();
    check(!!profile.data && !profile.error, 'Trusted administrator membership');
    const defaultsFor = () => ({
      short_description: '',
      description: '',
      problem: '',
      solution: '',
      role: '',
      architecture: '',
      features: [],
      category: 'Other',
      status: 'In progress',
      start_date: null,
      completion_date: null,
      thumbnail: '',
      github_url: '',
      demo_url: '',
      documentation_url: '',
      is_featured: false,
      is_published: false,
      sort_order: 0,
      technologies: [],
      gallery: [],
    });
    let data = { ...defaultsFor(), title: marker, slug: marker };
    const created = await db.rpc('save_project', { p_id: null, p_data: data });
    check(!created.error && !!created.data, 'Project create with child transaction');
    projectId = created.data;
    check(
      !(await anon.from('projects').select('id').eq('id', projectId)).data?.length,
      'Draft excluded from public reads',
    );
    data = { ...data, is_published: true, title: `${marker} edited` };
    check(
      !(await db.rpc('save_project', { p_id: projectId, p_data: data })).error,
      'Project edit and publish',
    );
    check(
      (await anon.from('projects').select('title').eq('id', projectId)).data?.[0]?.title ===
        data.title,
      'Published edit visible without redeployment',
    );
    check(
      !(await db.rpc('save_project', { p_id: projectId, p_data: { ...data, is_published: false } }))
        .error,
      'Project unpublish',
    );
    check(
      !(await anon.from('projects').select('id').eq('id', projectId)).data?.length,
      'Unpublished content disappears',
    );
    const category = await db.from('skill_categories').select('id').limit(1).single();
    check(!!category.data, 'Skill category read');
    for (const [table, record] of [
      ['skills', { name: marker, category_id: category.data.id }],
      ['certificates', { title: marker, organization: 'Integration test fixture' }],
    ]) {
      const inserted = await db.from(table).insert(record).select('id').single();
      check(!inserted.error, `${table} create`);
      cleanup.push([table, inserted.data.id]);
      check(
        !(await db.from(table).update({ is_published: true }).eq('id', inserted.data.id)).error,
        `${table} edit/publish`,
      );
    }
    check(
      !!(await anon.from('contact_messages').select('*')).error,
      'Private messages rejected for anonymous callers',
    );
    const path = `${login.data.user.id}/${crypto.randomUUID()}.pdf`;
    const uploaded = await db.storage
      .from('portfolio')
      .upload(path, new TextEncoder().encode('%PDF-1.4\n% Integration fixture\n%%EOF'), {
        contentType: 'application/pdf',
      });
    check(!uploaded.error, 'Authenticated storage upload');
    try {
      check(
        !!(await anon.storage.from('portfolio').createSignedUrl(path, 60)).error,
        'Unreferenced upload remains private',
      );
    } finally {
      await db.storage.from('portfolio').remove([path]);
    }
    check(!(await db.from('projects').delete().eq('id', projectId)).error, 'Project delete');
    projectId = undefined;
    for (const [table, id] of cleanup) {
      check(!(await db.from(table).delete().eq('id', id)).error, `${table} delete`);
    }
    cleanup.length = 0;
    check(!(await db.auth.signOut()).error, 'Logout');
    check(!(await db.auth.getUser()).data.user, 'Session removed');
    console.log(
      'NOT TESTED: Recovery email delivery, production Turnstile, Cloudflare auth cookies, SMTP, and production RLS/storage behavior beyond these checks.',
    );
  } catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
  } finally {
    if (projectId) await db.from('projects').delete().eq('id', projectId);
    for (const [table, id] of cleanup) await db.from(table).delete().eq('id', id);
    await db.auth.signOut();
  }
}
