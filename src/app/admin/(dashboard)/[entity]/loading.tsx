export default function Loading() {
  return (
    <div className="loading-state" role="status">
      <div className="skeleton" />
      <div className="skeleton" />
      <span>Loading content…</span>
    </div>
  );
}
