'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { entities, entitySchema, type Entity, type Field, type Row, str } from '@/lib/content';
import { formValues } from '@/lib/admin-data';
import { FileInput, GalleryInput, type GalleryImage } from './admin-controls';
import { editorGroups } from '@/lib/editor-groups';
export function ContentEditor({
  entity,
  row,
  categories = [],
}: {
  entity: Entity;
  row?: Row;
  categories?: Row[];
}) {
  const config = entities[entity],
    router = useRouter();
  const groups = editorGroups(entity);
  const [data, setData] = useState(() => formValues(entity, row)),
    [busy, setBusy] = useState(false),
    [pendingUploads, setPendingUploads] = useState(0),
    [error, setError] = useState(''),
    [fields, setFields] = useState<Record<string, string>>({});
  const set = (key: string, value: unknown) =>
    setData((previous) => ({ ...previous, [key]: value }));
  const uploadState = (uploading: boolean) =>
    setPendingUploads((count) => Math.max(0, count + (uploading ? 1 : -1)));
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingUploads > 0) return;
    setError('');
    setFields({});
    const parsed = entitySchema(entity).safeParse(data);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[String(i.path[0])] = i.message;
      });
      setFields(next);
      setError('Please check the highlighted fields.');
      document.getElementById(`field-${String(parsed.error.issues[0]?.path[0])}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/content/${entity}`, {
        method: row ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(row ? { id: row.id } : {}), data: parsed.data }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.fields)
          setFields(
            Object.fromEntries(
              Object.entries(result.fields as Record<string, string[]>).map(([k, v]) => [k, v[0]]),
            ),
          );
        throw new Error(result.error);
      }
      router.push(`/admin/${entity}?saved=1`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save content.');
    } finally {
      setBusy(false);
    }
  }
  function input(field: Field) {
    const value = data[field.key];
    const props = {
      id: `field-${field.key}`,
      name: field.key,
      disabled: busy,
      required: field.required,
      'aria-invalid': !!fields[field.key],
      'aria-describedby': fields[field.key] ? `error-${field.key}` : undefined,
    };
    if (field.kind === 'checkbox')
      return (
        <input
          {...props}
          type="checkbox"
          checked={!!value}
          onChange={(e) => set(field.key, e.target.checked)}
        />
      );
    if (field.kind === 'image' || field.kind === 'pdf')
      return (
        <FileInput
          id={props.id}
          onBusyChange={uploadState}
          value={String(value || '')}
          onChange={(path) => set(field.key, path)}
          pdf={field.kind === 'pdf'}
          disabled={busy}
        />
      );
    if (field.kind === 'gallery')
      return (
        <GalleryInput
          id={props.id}
          onBusyChange={uploadState}
          value={value as GalleryImage[]}
          onChange={(images) => set(field.key, images)}
        />
      );
    if (field.kind === 'category' || field.kind === 'service-category' || field.kind === 'select')
      return (
        <select
          {...props}
          value={String(value || '')}
          onChange={(e) => set(field.key, e.target.value)}
        >
          <option value="" disabled={field.required}>
            {field.required ? 'Select ' + field.label.toLowerCase() : 'No category'}
          </option>
          {field.kind === 'category' || field.kind === 'service-category'
            ? categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {str(c, 'name')}
                  {!c.is_published ? ' (hidden)' : ''}
                </option>
              ))
            : field.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    if (field.kind === 'textarea' || field.kind === 'list')
      return (
        <textarea
          {...props}
          rows={field.kind === 'list' ? 4 : 5}
          maxLength={field.kind === 'list' ? 30000 : field.max || 10000}
          value={field.kind === 'list' ? (value as string[]).join('\n') : String(value || '')}
          onChange={(e) =>
            set(field.key, field.kind === 'list' ? e.target.value.split('\n') : e.target.value)
          }
          placeholder={field.kind === 'list' ? 'One item per line' : undefined}
        />
      );
    return (
      <input
        {...props}
        type={
          field.kind === 'date'
            ? 'date'
            : field.kind === 'number' || field.kind === 'price'
              ? 'number'
              : field.kind === 'email'
                ? 'email'
                : field.kind === 'url'
                  ? 'url'
                  : 'text'
        }
        maxLength={field.max || 2000}
        step={field.kind === 'price' ? '0.01' : undefined}
        value={value === null ? '' : String(value ?? '')}
        onChange={(e) =>
          set(
            field.key,
            field.kind === 'number'
              ? Number(e.target.value)
              : field.kind === 'price'
                ? e.target.value === ''
                  ? null
                  : Number(e.target.value)
                : e.target.value,
          )
        }
      />
    );
  }
  return (
    <>
      <Link className="text-link" href={`/admin/${entity}`}>
        <ArrowLeft size={15} />
        Back to {config.label.toLowerCase()}
      </Link>
      <header className="admin-title" style={{ marginTop: 25 }}>
        <div>
          <div className="eyebrow">YOUR CONTENT / {config.label}</div>
          <h1>
            {entity === 'settings' ? 'Site settings' : `${row ? 'Edit' : 'New'} ${config.singular}`}
          </h1>
          <p>
            {entity === 'settings'
              ? 'Your identity, introduction, and public site details.'
              : 'Save as a draft, or publish when you’re ready.'}
          </p>
        </div>
      </header>
      <form className="admin-form" onSubmit={save} noValidate>
        <div className="editor-layout">
          <nav className="editor-nav" aria-label="Editor sections">
            <span className="eyebrow">ON THIS PAGE</span>
            {groups.map((group, index) => (
              <a href={'#editor-' + group.id} key={group.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {group.title}
              </a>
            ))}
          </nav>
          <div className="editor-fields">
            {groups.map((group) => (
              <section
                className="form-section"
                id={'editor-' + group.id}
                key={group.id}
                aria-labelledby={'heading-' + group.id}
              >
                <h2 className="form-section-title" id={'heading-' + group.id}>
                  {group.title}
                </h2>
                <p className="form-section-description">{group.description}</p>
                <div className="form-grid">
                  {group.fields.map((field) => {
                    const full = ['textarea', 'list', 'image', 'pdf', 'gallery'].includes(
                      field.kind || '',
                    );
                    return field.kind === 'checkbox' ? (
                      <label className="checkbox-field" key={field.key}>
                        {input(field)}
                        <span>{field.label}</span>
                      </label>
                    ) : (
                      <div className={`field ${full ? 'full-width' : ''}`} key={field.key}>
                        <label htmlFor={`field-${field.key}`}>
                          {field.label}
                          {field.required && <span className="accent"> *</span>}
                        </label>
                        {input(field)}
                        {(field.help || field.kind === 'list') && (
                          <span className="field-help">
                            {field.help || 'One item per line. Do not leave blank lines.'}
                          </span>
                        )}
                        {fields[field.key] && (
                          <span className="field-error" id={`error-${field.key}`}>
                            {fields[field.key]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Link className="button secondary" href={`/admin/${entity}`}>
            Cancel
          </Link>
          <button className="button primary" disabled={busy || pendingUploads > 0} type="submit">
            {busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />}{' '}
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
        <p className="field-help">
          Files removed from a field remain private unless used elsewhere. Delete unused uploads in
          the media library after saving.
        </p>
      </form>
    </>
  );
}
