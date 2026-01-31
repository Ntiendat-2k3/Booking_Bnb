"use client";

export default function ListingForm({ value, onChange, busy = false, children }) {
  // NOTE: This component is intentionally minimal.
  // You can move the full JSX form fields from:
  // - src/app/host/listings/new/page.jsx
  // - src/app/host/listings/[id]/page.jsx
  // into here to reduce duplication.

  return (
    <div className="space-y-6">
      {children}
      <pre className="text-xs opacity-70 overflow-auto rounded-lg border p-3">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
