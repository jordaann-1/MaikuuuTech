'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { str, type Row } from '@/lib/content';
import {
  attachmentAccept,
  contactMethods,
  inquirySchema,
  inquiryToday,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE,
  projectTypes,
  urgencyOptions,
} from '@/lib/inquiries';
import { SpamVerification } from './spam-verification';
type Catalog = { services: Row[]; budgets: Row[] };
export function InquiryForm({
  services,
  budgets,
  siteKey,
  selectedService = '',
}: Catalog & { siteKey?: string; selectedService?: string }) {
  const [catalog, setCatalog] = useState<Catalog>({ services, budgets }),
    [catalogBusy, setCatalogBusy] = useState(false),
    [method, setMethod] = useState('Email'),
    [projectType, setProjectType] = useState('Personal'),
    [files, setFiles] = useState<File[]>([]),
    [token, setToken] = useState(''),
    [resetKey, setResetKey] = useState(0),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(''),
    [fields, setFields] = useState<Record<string, string>>({}),
    [reference, setReference] = useState('');
  const nonce = useRef(''),
    fileInput = useRef<HTMLInputElement>(null),
    xhr = useRef<XMLHttpRequest | null>(null);
  const configured = !!siteKey && catalog.services.length > 0 && catalog.budgets.length > 0;
  function fieldError(name: string) {
    return fields[name] ? (
      <span className="field-error" id={'inquiry-' + name + '-error'}>
        {fields[name]}
      </span>
    ) : null;
  }
  function attributes(name: string) {
    return {
      'aria-invalid': !!fields[name],
      'aria-describedby': fields[name] ? 'inquiry-' + name + '-error' : undefined,
    };
  }
  async function refreshCatalog() {
    setCatalogBusy(true);
    setError('');
    try {
      const response = await fetch('/api/catalog', { cache: 'no-store' }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The service catalog could not be loaded.');
      setCatalog(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The service catalog could not be loaded.');
    } finally {
      setCatalogBusy(false);
    }
  }
  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const next = [...files, ...Array.from(event.target.files || [])];
    event.target.value = '';
    if (next.length > MAX_ATTACHMENTS) {
      setFields({ ...fields, attachments: 'Choose up to 3 files.' });
      return;
    }
    if (next.some((file) => file.size === 0 || file.size > MAX_ATTACHMENT_SIZE)) {
      setFields({ ...fields, attachments: 'Each file must be nonempty and no larger than 5 MB.' });
      return;
    }
    setFiles(next);
    setFields({ ...fields, attachments: '' });
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setError('');
    setFields({});
    nonce.current ||= crypto.randomUUID();
    const raw = Object.fromEntries(new FormData(form));
    delete raw.attachments;
    const parsed = inquirySchema.safeParse({
      ...raw,
      submission_id: nonce.current,
      privacy_consent: raw.privacy_consent === 'on',
      token,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[String(issue.path[0])] = issue.message;
      });
      setFields(next);
      setError('Please check the highlighted fields.');
      const first = parsed.error.issues[0]?.path[0];
      (form.elements.namedItem(String(first)) as HTMLElement | null)?.focus();
      return;
    }
    if (!token) {
      setError('Please complete spam verification.');
      return;
    }
    setBusy(true);
    setProgress(0);
    const body = new FormData();
    body.set('data', JSON.stringify(parsed.data));
    files.forEach((file) => body.append('attachments', file));
    try {
      const result = await new Promise<{ reference: string }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        xhr.current = request;
        request.open('POST', '/api/inquiries');
        request.timeout = 180000;
        request.upload.onprogress = (event) => {
          if (event.lengthComputable)
            setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        };
        request.onload = () => {
          try {
            const data = JSON.parse(request.responseText);
            if (request.status >= 200 && request.status < 300 && typeof data.reference === 'string')
              resolve(data);
            else {
              if (data.fields) setFields(data.fields);
              reject(
                new Error(data.error || 'Your request could not be submitted. Please try again.'),
              );
            }
          } catch {
            reject(
              new Error(
                'The response could not be confirmed. Retry with your entered information.',
              ),
            );
          }
        };
        request.onerror = () =>
          reject(new Error('Connection lost. Your information has been kept. Please retry.'));
        request.ontimeout = () =>
          reject(
            new Error('Confirmation timed out. Your information has been kept. Please retry.'),
          );
        request.send(body);
      });
      setReference(result.reference);
      form.reset();
      setFiles([]);
      nonce.current = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your request could not be submitted.');
    } finally {
      setBusy(false);
      xhr.current = null;
      setToken('');
      setResetKey((key) => key + 1);
    }
  }
  if (reference)
    return (
      <div className="contact-success inquiry-success" role="status">
        <div className="success-icon">
          <CheckCircle2 size={32} />
        </div>
        <span className="eyebrow">THANK YOU FOR REACHING OUT</span>
        <h2>
          Your request has been received<span className="accent">.</span>
        </h2>
        <p>
          Your project inquiry has been saved. I’ll review your requirements and get back to you
          through your preferred contact method.
        </p>
        <div className="request-reference">
          <span>Request reference</span>
          <strong>{reference}</strong>
        </div>
        <p className="field-help">
          Keep this reference for your conversation. It does not provide public access to your
          inquiry.
        </p>
        <button
          className="button secondary"
          onClick={() => {
            setReference('');
            setMethod('Email');
            setProjectType('Personal');
          }}
        >
          Start another inquiry
          <ArrowUpRight size={16} />
        </button>
      </div>
    );
  return (
    <form className="inquiry-form" onSubmit={submit} noValidate aria-label="Project inquiry">
      <div className="form-intro">
        <span className="eyebrow">YOUR NEXT PROJECT STARTS HERE</span>
        <h2>Tell me what you have in mind.</h2>
        <p className="muted">
          A few details will help us start the right conversation. Fields marked{' '}
          <span className="accent">*</span> are required.
        </p>
      </div>
      {!configured && (
        <div className="alert" role="status">
          Project inquiries are being configured. Please use the available contact links, or refresh
          the catalog once setup is complete.
          <button
            type="button"
            className="text-link"
            disabled={catalogBusy}
            onClick={refreshCatalog}
          >
            <RefreshCw size={14} />
            {catalogBusy ? 'Refreshing…' : 'Refresh services'}
          </button>
        </div>
      )}
      <fieldset disabled={busy}>
        <legend>
          <span>01</span> The right service
        </legend>
        <label className="field">
          <span>
            What service do you need? <span className="accent">*</span>
          </span>
          <select
            name="service_id"
            required
            defaultValue={
              catalog.services.some((row) => row.id === selectedService) ? selectedService : ''
            }
            {...attributes('service_id')}
          >
            <option value="">Choose a service</option>
            {catalog.services.map((row) => (
              <option value={row.id} key={row.id}>
                {str(row, 'title')}
              </option>
            ))}
          </select>
          {fieldError('service_id')}
        </label>
      </fieldset>
      <fieldset disabled={busy}>
        <legend>
          <span>02</span> Your contact details
        </legend>
        <div className="form-grid">
          {[
            {
              name: 'full_name',
              label: 'Full name',
              type: 'text',
              auto: 'name',
              max: 100,
              required: true,
            },
            {
              name: 'email',
              label: 'Email address',
              type: 'email',
              auto: 'email',
              max: 254,
              required: true,
            },
            {
              name: 'phone',
              label: 'Phone number',
              type: 'tel',
              auto: 'tel',
              max: 32,
              required: method === 'Phone',
            },
          ].map((field) => (
            <label className="field" key={field.name}>
              <span>
                {field.label}{' '}
                {field.required ? <span className="accent">*</span> : <small>Optional</small>}
              </span>
              <input
                name={field.name}
                type={field.type}
                autoComplete={field.auto}
                maxLength={field.max}
                required={field.required}
                {...attributes(field.name)}
              />
              {fieldError(field.name)}
            </label>
          ))}
          <label className="field">
            <span>
              Preferred contact method <span className="accent">*</span>
            </span>
            <select
              name="preferred_contact_method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {contactMethods.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {['Messenger', 'Other'].includes(method) && (
            <label className="field full-width">
              <span>
                Contact link or details <span className="accent">*</span>
              </span>
              <input
                name="external_contact"
                required
                maxLength={500}
                {...attributes('external_contact')}
              />
              <span className="field-help">
                Share a profile link, username, or the best way to reach you.
              </span>
              {fieldError('external_contact')}
            </label>
          )}
        </div>
      </fieldset>
      <fieldset disabled={busy}>
        <legend>
          <span>03</span> The project
        </legend>
        <label className="field">
          <span>
            Project title <span className="accent">*</span>
          </span>
          <input
            name="project_title"
            required
            minLength={3}
            maxLength={180}
            placeholder="A short name for your idea"
            {...attributes('project_title')}
          />
          {fieldError('project_title')}
        </label>
        <label className="field">
          <span>
            Project description <span className="accent">*</span>
          </span>
          <textarea
            name="project_description"
            required
            minLength={20}
            maxLength={10000}
            rows={5}
            placeholder="What would you like to build or improve? Who is it for?"
            {...attributes('project_description')}
          />
          {fieldError('project_description')}
        </label>
        <label className="field">
          <span>
            Required features <small>Optional</small>
          </span>
          <textarea
            name="required_features"
            maxLength={5000}
            rows={3}
            placeholder="The main features or problems to solve"
            {...attributes('required_features')}
          />
          {fieldError('required_features')}
        </label>
        <div className="form-grid">
          <label className="field">
            <span>
              Project type <span className="accent">*</span>
            </span>
            <select
              name="project_type"
              value={projectType}
              onChange={(event) => setProjectType(event.target.value)}
            >
              {projectTypes.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Estimated budget <span className="accent">*</span>
            </span>
            <select
              name="budget_range_id"
              required
              defaultValue=""
              {...attributes('budget_range_id')}
            >
              <option value="">Choose a budget range</option>
              {catalog.budgets.map((row) => (
                <option value={row.id} key={row.id}>
                  {str(row, 'label')}
                </option>
              ))}
            </select>
            {fieldError('budget_range_id')}
          </label>
          <label className="field">
            <span>
              Preferred deadline <small>Optional</small>
            </span>
            <input
              type="date"
              name="preferred_deadline"
              min={inquiryToday()}
              {...attributes('preferred_deadline')}
            />
            {fieldError('preferred_deadline')}
          </label>
          <label className="field">
            <span>
              Project urgency <span className="accent">*</span>
            </span>
            <select name="urgency" defaultValue="Normal">
              {urgencyOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="field-help">
          Budget and deadline preferences start a discussion. They are not a quotation or agreement.
        </p>
        {projectType === 'Academic' && (
          <p className="form-note">
            Academic support is tutoring, mentoring, consultation, and guided debugging. You remain
            the author of your work.
          </p>
        )}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>
          <span>04</span> A little more context
        </legend>
        <div className="attachment-picker">
          <Paperclip size={20} />
          <div>
            <h3>Supporting attachments</h3>
            <p className="field-help">
              Optional · up to 3 files, 5 MB each. PDF, JPG, PNG, WebP, TXT, or DOCX. Avoid
              sensitive personal information.
            </p>
          </div>
          <input
            ref={fileInput}
            id="inquiry-files"
            type="file"
            multiple
            accept={attachmentAccept}
            onChange={selectFiles}
            aria-label="Supporting attachments"
            aria-describedby="inquiry-attachments-error"
          />
        </div>
        <div id="inquiry-attachments-error">
          {fields.attachments && <p className="field-error">{fields.attachments}</p>}
        </div>
        {files.length > 0 && (
          <ul className="selected-files">
            {files.map((file, index) => (
              <li key={file.name + index}>
                <FileText size={16} />
                <span>
                  {file.name}
                  <small>{(file.size / 1024).toFixed(0)} KB</small>
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={'Remove ' + file.name}
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="field">
          <span>
            Additional notes <small>Optional</small>
          </span>
          <textarea
            name="additional_notes"
            maxLength={3000}
            rows={3}
            {...attributes('additional_notes')}
          />
          {fieldError('additional_notes')}
        </label>
        <label className="consent-field">
          <input
            type="checkbox"
            name="privacy_consent"
            required
            {...attributes('privacy_consent')}
          />
          <span>
            I have read the{' '}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer">
              privacy notice
            </Link>{' '}
            and agree to the processing of these details to review and respond to my inquiry.{' '}
            <span className="accent">*</span>
          </span>
        </label>
        {fieldError('privacy_consent')}
      </fieldset>
      <div className="honeypot" aria-hidden="true">
        <label>
          Leave this field empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {siteKey && (
        <SpamVerification
          siteKey={siteKey}
          onChange={setToken}
          onError={setError}
          resetKey={resetKey}
        />
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <div className="upload-progress" role="status">
          <progress max={100} value={progress} aria-label="Inquiry upload progress" />
          <span>
            {progress < 100
              ? `Uploading request… ${progress}%`
              : 'Upload complete. Securely saving your inquiry…'}
          </span>
        </div>
      )}
      <div className="form-submit">
        <p>
          <ShieldCheck size={15} /> Your inquiry stays private.
        </p>
        <button className="button primary" disabled={busy || !configured} type="submit">
          {busy ? (
            <>
              <Loader2 className="spin" size={17} />
              Submitting…
            </>
          ) : (
            <>
              Submit inquiry
              <ArrowUpRight size={18} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
