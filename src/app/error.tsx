'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container standalone-message">
      <div className="eyebrow">TEMPORARILY UNAVAILABLE</div>
      <h1>A brief interruption.</h1>
      <p>Content could not be loaded. Please try again in a moment.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
