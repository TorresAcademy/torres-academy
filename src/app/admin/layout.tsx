import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/require-admin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAdmin()

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Admin Panel</p>
            <h1 className="text-2xl font-bold">
              Torres <span className="text-blue-600">Academy</span>
            </h1>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">
              {profile.full_name || profile.email || 'Admin'}
            </p>
            <p className="text-xs uppercase tracking-[0.16em] text-blue-700">
              {profile.role}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <nav className="space-y-2">
            <Link
              href="/admin"
              className="block rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
            >
              Overview
            </Link>

            <Link
              href="/admin/courses"
              className="block rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
            >
              Courses
            </Link>

            <Link
              href="/admin/lessons"
              className="block rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
            >
              Lessons
            </Link>

            <Link
              href="/admin/teachers"
              className="block rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
            >
              Teachers
            </Link>

            <Link
              href="/admin/users"
              className="block rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
            >
              Users
            </Link>

            <Link
              href="/dashboard"
              className="block rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
            >
              Back to student area
            </Link>
          </nav>
        </aside>

        <section>{children}</section>
      </div>
    </main>
  )
}