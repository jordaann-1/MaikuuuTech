'use client';
import { useEffect, useState } from 'react';
import { mediaUrl } from '@/lib/content';
import { apiResult } from '@/lib/admin-data';
import { ConfirmDelete, FileInput } from './admin-controls';
import { EmptyState } from './public';
type MediaFile = { path: string; name: string; created_at: string };
export function MediaManager() {
  const [files, setFiles] = useState<MediaFile[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true),
    [pdf, setPdf] = useState(false);
  async function load() {
    const result = await apiResult(await fetch('/api/admin/media', { cache: 'no-store' }));
    setFiles(result.files);
  }
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/media', { cache: 'no-store' })
      .then(apiResult)
      .then((result) => {
        if (alive) setFiles(result.files);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <>
      <header className="admin-title">
        <div>
          <div className="eyebrow">YOUR UPLOADS</div>
          <h1>Media library</h1>
          <p>Private by default. Public only while referenced by published content.</p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            setBusy(true);
            setError('');
            void load()
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          Refresh
        </button>
      </header>
      <div className="form-section">
        <label className="checkbox-field">
          <input type="checkbox" checked={pdf} onChange={(e) => setPdf(e.target.checked)} />
          Upload a PDF document
        </label>
        <FileInput
          pdf={pdf}
          value=""
          onChange={() => {
            void load().catch((e) => setError(e.message));
          }}
        />
        <p className="field-help" style={{ marginTop: 15, marginBottom: 0 }}>
          Use the upload controls in content editors to attach files. This library lists your own
          uploads (up to 1,000). Unlink a file from all content before deleting it.
        </p>
      </div>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {busy ? (
        <p role="status" className="muted">
          Loading media…
        </p>
      ) : files.length ? (
        <div className="media-grid">
          {files.map((file) => (
            <article key={file.path} className="media-card">
              {file.path.endsWith('.pdf') ? (
                <div className="pdf-placeholder">PDF</div>
              ) : (
                <img
                  src={mediaUrl(file.path)}
                  alt="Uploaded asset"
                  width={400}
                  height={240}
                  loading="lazy"
                />
              )}
              <div>
                <p>{file.name}</p>
                <div className="row-actions">
                  <a
                    className="button secondary"
                    href={mediaUrl(file.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Preview
                  </a>
                  <ConfirmDelete
                    label={file.name}
                    onConfirm={async () => {
                      await apiResult(
                        await fetch(`/api/admin/media?path=${encodeURIComponent(file.path)}`, {
                          method: 'DELETE',
                        }),
                      );
                      await load();
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          title="Room for your work."
          description="Your photographs, screenshots, certificates, and documents will live here."
        />
      )}
    </>
  );
}
