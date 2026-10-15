import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="container standalone-message" aria-labelledby="notfound-title">
      <div className="eyebrow">404 / A SMALL DETOUR</div>
      <h1 id="notfound-title">
        This page took
        <br />a different path<span className="accent">.</span>
      </h1>
      <p>The page may have moved, or the content isn’t public.</p>
      <Link className="button primary" href="/">
        Back to home ↗
      </Link>
    </section>
  );
}
