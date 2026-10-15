'use client';
import { useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { mediaUrl } from '@/lib/content';
export function ConfirmDelete({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label={`Delete ${label}`}
        onClick={() => {
          setError('');
          dialog.current?.showModal();
        }}
      >
        <Trash2 size={15} />
      </button>
      <dialog ref={dialog} className="modal" aria-labelledby={titleId}>
        <h2 id={titleId}>Delete this item?</h2>
        <p>“{label}” will be permanently removed. This cannot be undone.</p>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Keep item
          </button>
          <button
            className="button danger"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                dialog.current?.close();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Deletion failed.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </dialog>
    </>
  );
}
export function FileInput({
  value,
  onChange,
  pdf = false,
  disabled = false,
  id,
  onBusyChange,
}: {
  value: string;
  onChange: (path: string) => void;
  pdf?: boolean;
  disabled?: boolean;
  id?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose a file smaller than 10 MB.');
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    const form = new FormData();
    form.set('file', file);
    try {
      const response = await fetch('/api/admin/media', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onChange(result.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      event.target.value = '';
    }
  }
  return (
    <div className="upload-field">
      {value && (
        <div className="upload-preview">
          {pdf ? (
            <FileText size={30} />
          ) : (
            <img src={mediaUrl(value)} width={95} height={65} alt="Uploaded preview" />
          )}
          <a href={mediaUrl(value)} target="_blank" rel="noopener noreferrer">
            Preview {pdf ? 'PDF' : 'image'}
          </a>
          <button
            type="button"
            className="button secondary"
            disabled={disabled || busy}
            onClick={() => onChange('')}
          >
            Remove
          </button>
        </div>
      )}
      <label className="field" style={{ marginBottom: 0 }}>
        <span className="field-help">
          {busy ? (
            <span>
              <Loader2 size={13} className="spin" style={{ display: 'inline' }} /> Uploading…
            </span>
          ) : (
            <span>
              <Upload size={13} style={{ display: 'inline', marginRight: 6 }} />
              {pdf ? 'PDF' : 'JPEG, PNG or WebP'} · up to 10 MB
            </span>
          )}
        </span>
        <input
          id={id}
          type="file"
          accept={pdf ? 'application/pdf' : 'image/jpeg,image/png,image/webp'}
          disabled={busy || disabled}
          onChange={upload}
        />
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export type GalleryImage = { path: string; alt_text: string; sort_order: number };
export function GalleryInput({
  value,
  onChange,
  id,
  onBusyChange,
}: {
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  id?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  function set(images: GalleryImage[]) {
    onChange(images.map((image, i) => ({ ...image, sort_order: i })));
  }
  function move(index: number, delta: number) {
    const images = [...value];
    [images[index], images[index + delta]] = [images[index + delta], images[index]];
    set(images);
  }
  return (
    <div
      className="gallery-editor"
      id={id}
      role="group"
      aria-label="Screenshot gallery"
      tabIndex={-1}
    >
      {value.map((image, index) => (
        <div className="gallery-edit-item" key={`${image.path}-${index}`}>
          <img
            src={mediaUrl(image.path)}
            alt={image.alt_text || 'Screenshot preview'}
            width={80}
            height={65}
          />
          <label>
            <span className="sr-only">Screenshot {index + 1} description</span>
            <input
              value={image.alt_text}
              placeholder="Describe this screenshot (required)"
              maxLength={300}
              required
              onChange={(event) =>
                set(
                  value.map((item, i) =>
                    i === index ? { ...item, alt_text: event.target.value } : item,
                  ),
                )
              }
            />
          </label>
          <div className="row-actions">
            <button
              type="button"
              className="icon-button"
              disabled={index === 0}
              aria-label={`Move screenshot ${index + 1} up`}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              disabled={index === value.length - 1}
              aria-label={`Move screenshot ${index + 1} down`}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove screenshot ${index + 1}`}
              onClick={() => set(value.filter((_, i) => i !== index))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      {value.length < 24 && (
        <FileInput
          value=""
          onBusyChange={onBusyChange}
          onChange={(path) => {
            if (path) set([...value, { path, alt_text: '', sort_order: value.length }]);
          }}
        />
      )}
    </div>
  );
}
