import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty">
      <h1>A little off the beaten path.</h1>
      <p>We couldn’t find that page.</p>
      <Link className="button" href="/">
        Return to the collection
      </Link>
    </main>
  );
}
