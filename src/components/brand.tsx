export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`brand-mark ${className}`} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 24V8h5l6 9 6-9h5v16h-5V16l-6 8-6-8v8H5Z" fill="currentColor" />
      <path d="M23 3h6v3h-6z" className="brand-mark-detail" />
    </svg>
  );
}
