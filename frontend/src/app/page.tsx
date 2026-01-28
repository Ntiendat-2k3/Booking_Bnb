export default function HomePage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Airbnb Clone (MVP UI)</h1>
      <p className="text-slate-600">
        Frontend này đã khớp backend zip-style: register/login/google/refresh/profile.
      </p>

      <div className="rounded-lg border p-4 space-y-2">
        <p className="font-medium">Endpoints đang dùng:</p>
        <ul className="list-disc pl-5 text-slate-700">
          <li><code className="rounded bg-slate-100 px-1">POST /api/v1/auth/register</code></li>
          <li><code className="rounded bg-slate-100 px-1">POST /api/v1/auth/login</code></li>
          <li><code className="rounded bg-slate-100 px-1">GET /api/v1/auth/google</code></li>
          <li><code className="rounded bg-slate-100 px-1">POST /api/v1/auth/refresh</code></li>
          <li><code className="rounded bg-slate-100 px-1">POST /api/v1/auth/logout</code></li>
          <li><code className="rounded bg-slate-100 px-1">GET /api/v1/auth/profile</code></li>
        </ul>
      </div>
    </div>
  );
}
