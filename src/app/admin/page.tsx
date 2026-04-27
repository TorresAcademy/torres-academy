import Link from 'next/link'
import {
  Award,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { requireAdmin } from '@/lib/admin/require-admin'

function AdminStatCard({
  label,
  value,
  icon,
  tone = 'slate',
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone?: 'slate' | 'gold' | 'emerald' | 'red'
}) {
  const tones = {
    slate: {
      card: 'border-slate-200 bg-white',
      icon: 'bg-slate-900 text-amber-300',
    },
    gold: {
      card: 'border-amber-200 bg-amber-50',
      icon: 'bg-amber-400 text-black',
    },
    emerald: {
      card: 'border-emerald-200 bg-emerald-50',
      icon: 'bg-emerald-600 text-white',
    },
    red: {
      card: 'border-red-200 bg-red-50',
      icon: 'bg-red-600 text-white',
    },
  } as const

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tones[tone].card}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone].icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
          {icon}
        </div>

        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  )
}

function QuickLink({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
    >
      {label}
    </Link>
  )
}

export default async function AdminPage() {
  const { profile } = await requireAdmin()

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Admin Overview
            </p>

            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Welcome, {profile.full_name || profile.email}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Manage the academy with a premium control center for courses,
              lessons, teachers, users, and certificates.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Premium admin workspace
                </p>
                <p className="text-sm text-slate-300">
                  Your control panel is working.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Courses"
          value="Manage"
          icon={<BookOpen className="h-5 w-5" />}
          tone="gold"
        />
        <AdminStatCard
          label="Lessons"
          value="Control"
          icon={<ClipboardList className="h-5 w-5" />}
          tone="slate"
        />
        <AdminStatCard
          label="Teachers"
          value="Oversee"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <AdminStatCard
          label="Users"
          value="Support"
          icon={<Users className="h-5 w-5" />}
          tone="red"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Current features</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Your admin system already includes the core academy management tools.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FeatureCard
              title="Course administration"
              description="Review, manage, and organize courses across the academy."
              icon={<BookOpen className="h-5 w-5" />}
            />

            <FeatureCard
              title="Lesson structure"
              description="Control lesson content, sequencing, and publication workflow."
              icon={<ClipboardList className="h-5 w-5" />}
            />

            <FeatureCard
              title="Teacher oversight"
              description="Monitor teacher spaces, activity areas, and teaching operations."
              icon={<ShieldCheck className="h-5 w-5" />}
            />

            <FeatureCard
              title="Users and certificates"
              description="Manage platform users and oversee certificate-related areas."
              icon={<Award className="h-5 w-5" />}
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Quick actions</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Jump quickly into the main administration sections.
          </p>

          <div className="mt-6 grid gap-3">
            <QuickLink href="/admin/courses" label="Open courses" />
            <QuickLink href="/admin/lessons" label="Open lessons" />
            <QuickLink href="/admin/teachers" label="Open teachers" />
            <QuickLink href="/admin/users" label="Open users" />
            <QuickLink href="/admin/certificates" label="Open certificates" />
            <QuickLink href="/dashboard" label="Go to student area" />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Administrative focus</h2>

        <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            Keep courses and lessons well structured so students and teachers
            experience a clear, reliable learning environment.
          </p>

          <p>
            Maintain visibility over teachers, users, and certificates to ensure
            quality control across the academy.
          </p>

          <p>
            This premium admin area can later be expanded with analytics, usage
            trends, and academy-wide reporting.
          </p>
        </div>
      </section>
    </div>
  )
}