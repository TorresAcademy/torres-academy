// src/app/admin/guardians/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import UserAvatar from '@/components/user-avatar'

type AdminGuardianPageProps = {
  searchParams?: Promise<{
    q?: string
    message?: string
    error?: string
  }>
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  avatar_url: string | null
  guardian_email: string | null
}

type GuardianLink = {
  id: string
  guardian_id: string
  student_id: string
  relationship: string | null
  status: string
  created_at: string
  updated_at: string
}

function cleanSearch(value: string) {
  return value.trim().replaceAll(',', ' ').slice(0, 120)
}

function redirectWithMessage(type: 'message' | 'error', value: string) {
  redirect(`/admin/guardians?${type}=${encodeURIComponent(value)}`)
}

async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/admin/guardians')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return user
}

function StatCard({
  label,
  value,
  note,
  icon,
  tone = 'white',
}: {
  label: string
  value: number | string
  note?: string
  icon: React.ReactNode
  tone?: 'white' | 'amber' | 'emerald' | 'blue'
}) {
  const tones = {
    white: 'border-slate-200 bg-white text-slate-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
  } as const

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm opacity-75">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {note && <p className="mt-1 text-xs opacity-75">{note}</p>}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
          {icon}
        </div>
      </div>
    </div>
  )
}

export default async function AdminGuardianManagementPage({
  searchParams,
}: AdminGuardianPageProps) {
  await requireAdmin()

  const params = (await searchParams) ?? {}
  const q = cleanSearch(params.q || '')
  const serviceSupabase = createServiceRoleClient()

  let studentsQuery = serviceSupabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, guardian_email')
    .eq('role', 'student')
    .order('full_name', { ascending: true })
    .limit(80)

  if (q) {
    studentsQuery = studentsQuery.or(
      `email.ilike.%${q}%,full_name.ilike.%${q}%,guardian_email.ilike.%${q}%`
    )
  }

  const [studentsResult, guardiansResult, linksResult] = await Promise.all([
    studentsQuery,
    serviceSupabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, guardian_email')
      .eq('role', 'parent')
      .order('full_name', { ascending: true })
      .limit(200),
    serviceSupabase
      .from('parent_guardian_links')
      .select('id, guardian_id, student_id, relationship, status, created_at, updated_at')
      .order('created_at', { ascending: false }),
  ])

  const students = (studentsResult.data ?? []) as ProfileRow[]
  const guardians = (guardiansResult.data ?? []) as ProfileRow[]
  const links = (linksResult.data ?? []) as GuardianLink[]

  const studentIds = students.map((student) => student.id)
  const linkedGuardianIds = [...new Set(links.map((link) => link.guardian_id))]

  let linkedGuardians: ProfileRow[] = []

  if (linkedGuardianIds.length > 0) {
    const { data } = await serviceSupabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, guardian_email')
      .in('id', linkedGuardianIds)

    linkedGuardians = (data ?? []) as ProfileRow[]
  }

  const guardianMap = new Map(
    [...guardians, ...linkedGuardians].map((guardian) => [guardian.id, guardian])
  )

  const activeLinks = links.filter((link) => link.status === 'active')
  const activeLinksForVisibleStudents = activeLinks.filter((link) =>
    studentIds.includes(link.student_id)
  )

  async function updateGuardianEmail(formData: FormData) {
    'use server'

    await requireAdmin()
    const serviceSupabase = createServiceRoleClient()

    const studentId = String(formData.get('student_id') || '').trim()
    const guardianEmail = String(formData.get('guardian_email') || '')
      .trim()
      .toLowerCase()

    if (!studentId) {
      redirectWithMessage('error', 'Student is required.')
    }

    await serviceSupabase
      .from('profiles')
      .update({
        guardian_email: guardianEmail || null,
      })
      .eq('id', studentId)

    revalidatePath('/admin/guardians')
    redirectWithMessage('message', 'Guardian email updated.')
  }

  async function linkGuardian(formData: FormData) {
    'use server'

    await requireAdmin()
    const serviceSupabase = createServiceRoleClient()

    const studentId = String(formData.get('student_id') || '').trim()
    const guardianEmail = String(formData.get('guardian_email') || '')
      .trim()
      .toLowerCase()
    const relationship = String(formData.get('relationship') || 'Parent').trim()

    if (!studentId || !guardianEmail) {
      redirectWithMessage('error', 'Student and guardian email are required.')
    }

    const { data: student } = await serviceSupabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', studentId)
      .maybeSingle()

    if (!student) {
      redirectWithMessage('error', 'Student profile was not found.')
    }

    const { data: guardian } = await serviceSupabase
      .from('profiles')
      .select('id, email, role')
      .ilike('email', guardianEmail)
      .maybeSingle()

    if (!guardian) {
      await serviceSupabase
        .from('profiles')
        .update({ guardian_email: guardianEmail })
        .eq('id', studentId)

      redirectWithMessage(
        'error',
        'Guardian account not found. Ask the parent/guardian to register first, then link again.'
      )
    }

    if (guardian.id === studentId) {
      redirectWithMessage(
        'error',
        'Guardian account must be separate from the student account.'
      )
    }

    if (guardian.role !== 'admin' && guardian.role !== 'teacher') {
      const { error: roleError } = await serviceSupabase
        .from('profiles')
        .update({ role: 'parent' })
        .eq('id', guardian.id)

      if (roleError) {
        redirectWithMessage(
          'error',
          `Could not set guardian role to parent: ${roleError.message}`
        )
      }
    }

    await serviceSupabase
      .from('profiles')
      .update({ guardian_email: guardianEmail })
      .eq('id', studentId)

    const { error: linkError } = await serviceSupabase
      .from('parent_guardian_links')
      .upsert(
        {
          guardian_id: guardian.id,
          student_id: studentId,
          relationship: relationship || 'Parent',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'guardian_id,student_id',
        }
      )

    if (linkError) {
      redirectWithMessage('error', linkError.message)
    }

    revalidatePath('/admin/guardians')
    revalidatePath('/parent')
    redirectWithMessage('message', 'Guardian linked successfully.')
  }

  async function revokeGuardianLink(formData: FormData) {
    'use server'

    await requireAdmin()
    const serviceSupabase = createServiceRoleClient()

    const linkId = String(formData.get('link_id') || '').trim()

    if (!linkId) {
      redirectWithMessage('error', 'Guardian link is required.')
    }

    const { error } = await serviceSupabase
      .from('parent_guardian_links')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId)

    if (error) {
      redirectWithMessage('error', error.message)
    }

    revalidatePath('/admin/guardians')
    revalidatePath('/parent')
    redirectWithMessage('message', 'Guardian access revoked.')
  }

  return (
    <main className="min-h-screen bg-[#f7f3e8] text-slate-900">
      <section className="bg-gradient-to-br from-black via-[#17120a] to-[#5b4300] text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/admin"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              ← Back to admin
            </Link>

            <Link
              href="/parent"
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Preview parent view
            </Link>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
                Admin Guardian Management
              </p>

              <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">
                Parent / guardian links
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-amber-50/90">
                Manage guardian emails, promote registered guardian accounts to
                the parent role, and securely link parents to students.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-black">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-amber-100/80">Secure access</p>
                  <p className="text-xl font-bold text-white">
                    Admin controlled
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-amber-50/80">
                Guardian email alone does not grant access. Access is only
                granted when an admin creates an active guardian link.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        {params.message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{params.message}</span>
            </div>
          </div>
        )}

        {params.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{params.error}</span>
            </div>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Students"
            value={students.length}
            note={q ? 'Search result' : 'Visible students'}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Parent accounts"
            value={guardians.length}
            note="Profiles with parent role"
            icon={<UserRound className="h-5 w-5" />}
            tone="blue"
          />
          <StatCard
            label="Active links"
            value={activeLinks.length}
            note="Guardian-student links"
            icon={<Link2 className="h-5 w-5" />}
            tone="emerald"
          />
          <StatCard
            label="Linked here"
            value={activeLinksForVisibleStudents.length}
            note="For listed students"
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="amber"
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <form className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search students
              </label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search by student name, email, or guardian email..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black"
            >
              <Search className="h-4 w-4" />
              Search
            </button>

            <Link
              href="/admin/guardians"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
            >
              Clear
            </Link>
          </form>
        </section>

        <section className="space-y-5">
          {students.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">No students found.</p>
            </div>
          ) : (
            students.map((student) => {
              const studentLinks = links.filter(
                (link) =>
                  link.student_id === student.id && link.status === 'active'
              )

              return (
                <article
                  key={student.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
                    <div>
                      <div className="flex items-start gap-4">
                        <UserAvatar
                          src={student.avatar_url}
                          name={student.full_name}
                          email={student.email}
                          size="lg"
                        />

                        <div>
                          <h2 className="text-2xl font-bold text-slate-900">
                            {student.full_name || student.email || 'Student'}
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            {student.email || 'No email'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              role: {student.role || 'student'}
                            </span>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                              guardian email:{' '}
                              {student.guardian_email || 'not set'}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              {studentLinks.length} active guardian link
                              {studentLinks.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                            <Mail className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              Student guardian email
                            </p>
                            <p className="text-sm text-slate-500">
                              Defaults to the student email, but admin can
                              override it.
                            </p>
                          </div>
                        </div>

                        <form
                          action={updateGuardianEmail}
                          className="mt-4 flex flex-wrap gap-3"
                        >
                          <input
                            type="hidden"
                            name="student_id"
                            value={student.id}
                          />
                          <input
                            name="guardian_email"
                            type="email"
                            defaultValue={student.guardian_email || student.email || ''}
                            placeholder="guardian@email.com"
                            className="min-w-[260px] flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                          />
                          <button
                            type="submit"
                            className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black"
                          >
                            Save email
                          </button>
                        </form>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                          <Link2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            Link guardian account
                          </p>
                          <p className="text-sm text-slate-500">
                            Parent must have registered first.
                          </p>
                        </div>
                      </div>

                      <form action={linkGuardian} className="mt-4 space-y-3">
                        <input
                          type="hidden"
                          name="student_id"
                          value={student.id}
                        />

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Guardian account email
                          </label>
                          <input
                            name="guardian_email"
                            type="email"
                            defaultValue={student.guardian_email || ''}
                            placeholder="parent@email.com"
                            required
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Relationship
                          </label>
                          <input
                            name="relationship"
                            defaultValue="Parent"
                            placeholder="Parent, Guardian, Mother, Father..."
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
                        >
                          Link guardian
                        </button>
                      </form>

                      <div className="mt-5 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">
                          Active guardians
                        </p>

                        {studentLinks.length === 0 ? (
                          <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">
                            No active guardian account linked yet.
                          </p>
                        ) : (
                          studentLinks.map((link) => {
                            const guardian = guardianMap.get(link.guardian_id)

                            return (
                              <div
                                key={link.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-slate-900">
                                      {guardian?.full_name ||
                                        guardian?.email ||
                                        'Guardian'}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      {guardian?.email || 'No email'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {link.relationship || 'Guardian'} ·{' '}
                                      {link.status}
                                    </p>
                                  </div>

                                  <form action={revokeGuardianLink}>
                                    <input
                                      type="hidden"
                                      name="link_id"
                                      value={link.id}
                                    />
                                    <button
                                      type="submit"
                                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Revoke
                                    </button>
                                  </form>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
