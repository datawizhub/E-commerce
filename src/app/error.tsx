"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1>Something didn’t load.</h1>
      <p>
        Try opening this page again. Your saved local edits are still in this
        browser.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
