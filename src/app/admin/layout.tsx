import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Award,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserCircle2,
  Users,
} from 'lucide-react'
import { requireAdmin } from '@/lib/admin/require-admin'
import UserAvatar from '@/components/user-avatar'
import LogoutButton from '@/components/logout-button'

function NavLink({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-amber-300"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition group-hover:bg-amber-400/10 group-hover:text-amber-300">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAdmin()

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 bg-[#050505]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-300/80">
              Admin Panel
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              <span className="text-white">Torres </span>
              <span className="text-amber-400">Academy</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">
                {profile.full_name || profile.email || 'Admin'}
              </p>

              <p className="text-xs uppercase tracking-[0.18em] text-amber-300">
                {profile.role}
              </p>
            </div>

            <div className="rounded-full ring-2 ring-amber-400/40">
              <UserAvatar
                src={profile.avatar_url}
                name={profile.full_name}
                email={profile.email}
                size="sm"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:grid-cols-[290px_1fr]">
        <aside className="h-fit rounded-[2rem] border border-white/10 bg-[#050505] p-5 shadow-2xl shadow-black/30 md:sticky md:top-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-400/10 to-transparent p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Premium admin space
            </p>

            <p className="mt-2 text-sm leading-7 text-slate-300">
              Oversee courses, lessons, teachers, users, certificates, and the
              overall academy system from one executive workspace.
            </p>
          </div>

          <nav className="mt-5 space-y-2">
            <NavLink
              href="/admin"
              label="Overview"
              icon={<LayoutDashboard className="h-4 w-4" />}
            />

            <NavLink
              href="/admin/courses"
              label="Courses"
              icon={<BookOpen className="h-4 w-4" />}
            />

            <NavLink
              href="/admin/lessons"
              label="Lessons"
              icon={<ClipboardList className="h-4 w-4" />}
            />

            <NavLink
              href="/admin/teachers"
              label="Teachers"
              icon={<ShieldCheck className="h-4 w-4" />}
            />

            <NavLink
              href="/admin/users"
              label="Users"
              icon={<Users className="h-4 w-4" />}
            />

            <NavLink
              href="/admin/certificates"
              label="Certificates"
              icon={<Award className="h-4 w-4" />}
            />

            <NavLink
              href="/dashboard"
              label="Back to student area"
              icon={<UserCircle2 className="h-4 w-4" />}
            />
          </nav>

          <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="text-sm font-semibold text-amber-300">
              Administration focus
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Keep the academy organized, maintain quality control, and monitor
              the learning environment across all users and courses.
            </p>
          </div>

          <div className="mt-6">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-2">
              <div className="flex items-center gap-2 px-3 pb-2 pt-1 text-sm font-semibold text-red-300">
                <LogOut className="h-4 w-4" />
                Logout
              </div>

              <div className="[&>button]:flex [&>button]:w-full [&>button]:items-center [&>button]:justify-center [&>button]:rounded-xl [&>button]:bg-red-600 [&>button]:px-4 [&>button]:py-3 [&>button]:font-semibold [&>button]:text-white [&>button]:transition [&>button]:hover:bg-red-700">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-[#f7f3e8] p-4 text-slate-900 shadow-2xl shadow-black/10 md:p-6">
          {children}
        </section>
      </div>
    </main>
  )
}