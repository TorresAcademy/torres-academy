import { requireAdmin } from '@/lib/admin/require-admin'

export default async function AdminPage() {
  const { profile } = await requireAdmin()

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Admin Panel
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Welcome, {profile.full_name || profile.email}
        </h1>

        <p className="mt-3 text-slate-600">
          Your admin panel is working.
        </p>
      </div>
    </main>
  )
}