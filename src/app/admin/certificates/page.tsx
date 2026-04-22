import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/require-admin'
import UserAvatar from '@/components/user-avatar'

type AdminCertificatesPageProps = {
  searchParams: Promise<{
    q?: string
    status?: string
  }>
}

type Certificate = {
  id: number
  user_id: string
  course_id: number
  verification_code: string
  status: string
  issued_at: string
  revoked_at: string | null
  revoked_reason: string | null
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

type Course = {
  id: number
  title: string
  slug: string
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleString()
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function getStatusBadgeClass(status: string) {
  if (status === 'revoked') {
    return 'bg-red-100 text-red-700'
  }

  return 'bg-green-100 text-green-700'
}

export default async function AdminCertificatesPage({
  searchParams,
}: AdminCertificatesPageProps) {
  const params = await searchParams
  const searchQuery = params.q ?? ''
  const selectedStatus = params.status ?? 'all'

  const { supabase } = await requireAdmin()

  let certificateQuery = supabase
    .from('certificates')
    .select(
      'id, user_id, course_id, verification_code, status, issued_at, revoked_at, revoked_reason'
    )
    .order('issued_at', { ascending: false })

  if (selectedStatus !== 'all') {
    certificateQuery = certificateQuery.eq('status', selectedStatus)
  }

  const { data: certificatesData } = await certificateQuery

  const certificates = (certificatesData ?? []) as Certificate[]

  const userIds = [...new Set(certificates.map((certificate) => certificate.user_id))]
  const courseIds = [
    ...new Set(certificates.map((certificate) => certificate.course_id)),
  ]

  let profiles: Profile[] = []
  let courses: Course[] = []

  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds)

    profiles = (profilesData ?? []) as Profile[]
  }

  if (courseIds.length > 0) {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title, slug')
      .in('id', courseIds)

    courses = (coursesData ?? []) as Course[]
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const courseMap = new Map(courses.map((course) => [course.id, course]))

  const query = normalize(searchQuery)

  const filteredCertificates = certificates.filter((certificate) => {
    const profile = profileMap.get(certificate.user_id)
    const course = courseMap.get(certificate.course_id)

    const searchable = normalize(
      [
        profile?.full_name ?? '',
        profile?.email ?? '',
        course?.title ?? '',
        course?.slug ?? '',
        certificate.verification_code,
        certificate.status,
        certificate.revoked_reason ?? '',
      ].join(' ')
    )

    return !query || searchable.includes(query)
  })

  const totalIssued = certificates.filter(
    (certificate) => certificate.status === 'issued'
  ).length

  const totalRevoked = certificates.filter(
    (certificate) => certificate.status === 'revoked'
  ).length

  async function revokeCertificate(formData: FormData) {
    'use server'

    const { supabase } = await requireAdmin()

    const certificateId = Number(formData.get('certificate_id'))
    const reason = String(formData.get('reason') || '').trim()

    if (!certificateId || Number.isNaN(certificateId)) {
      return
    }

    await supabase
      .from('certificates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_reason: reason || 'Revoked by admin.',
      })
      .eq('id', certificateId)

    revalidatePath('/admin/certificates')
  }

  async function reissueCertificate(formData: FormData) {
    'use server'

    const { supabase } = await requireAdmin()

    const certificateId = Number(formData.get('certificate_id'))

    if (!certificateId || Number.isNaN(certificateId)) {
      return
    }

    await supabase
      .from('certificates')
      .update({
        status: 'issued',
        issued_at: new Date().toISOString(),
        revoked_at: null,
        revoked_reason: null,
      })
      .eq('id', certificateId)

    revalidatePath('/admin/certificates')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Certificates
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Certificate management
        </h2>

        <p className="mt-2 text-slate-600">
          Review issued certificates, verify records, revoke certificates, and
          reissue revoked certificates.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Filtered records</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {filteredCertificates.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Total: {certificates.length}
          </p>
        </div>

        <div className="rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <p className="text-sm text-green-700">Issued</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {totalIssued}
          </p>
        </div>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm text-red-700">Revoked</p>
          <p className="mt-2 text-3xl font-bold text-red-700">
            {totalRevoked}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <p className="text-sm text-blue-700">Public verification</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">Live</p>
        </div>
      </div>

      <form
        action="/admin/certificates"
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>

            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Student, email, course, code..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>

            <select
              name="status"
              defaultValue={selectedStatus}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="all">All statuses</option>
              <option value="issued">Issued</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Apply
          </button>

          <Link
            href="/admin/certificates"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
          >
            Clear
          </Link>
        </div>
      </form>

      {filteredCertificates.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            No certificates found
          </h3>

          <p className="mt-2 text-slate-600">
            Try clearing your filters or searching another student, course, or
            verification code.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCertificates.map((certificate) => {
            const profile = profileMap.get(certificate.user_id)
            const course = courseMap.get(certificate.course_id)

            return (
              <article
                key={certificate.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      src={profile?.avatar_url ?? null}
                      name={profile?.full_name ?? null}
                      email={profile?.email ?? null}
                      size="md"
                    />

                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {profile?.full_name ||
                          profile?.email ||
                          'Unknown student'}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {profile?.email || 'No email'}
                      </p>

                      <p className="mt-3 font-semibold text-blue-700">
                        {course?.title || 'Unknown course'}
                      </p>

                      <p className="mt-2 break-all text-sm text-slate-500">
                        Code: {certificate.verification_code}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-4 py-2 text-sm font-bold ${getStatusBadgeClass(
                      certificate.status
                    )}`}
                  >
                    {certificate.status}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Issued
                    </p>

                    <p className="mt-2 font-bold text-slate-900">
                      {formatDate(certificate.issued_at)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Revoked
                    </p>

                    <p className="mt-2 font-bold text-slate-900">
                      {formatDate(certificate.revoked_at)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Certificate ID
                    </p>

                    <p className="mt-2 font-bold text-slate-900">
                      #{certificate.id}
                    </p>
                  </div>
                </div>

                {certificate.revoked_reason && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-semibold">Revocation reason</p>
                    <p className="mt-2">{certificate.revoked_reason}</p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/certificates/${certificate.id}`}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Open certificate
                  </Link>

                  <Link
                    href={`/certificates/verify/${certificate.verification_code}`}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Public verification
                  </Link>

                  {course && (
                    <Link
                      href={`/courses/${course.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      Course
                    </Link>
                  )}
                </div>

                {certificate.status === 'issued' ? (
                  <form
                    action={revokeCertificate}
                    className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4"
                  >
                    <input
                      type="hidden"
                      name="certificate_id"
                      value={certificate.id}
                    />

                    <label className="mb-2 block text-sm font-semibold text-red-800">
                      Revoke certificate
                    </label>

                    <textarea
                      name="reason"
                      rows={3}
                      placeholder="Reason for revocation..."
                      className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-400"
                    />

                    <button
                      type="submit"
                      className="mt-3 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
                    >
                      Revoke certificate
                    </button>
                  </form>
                ) : (
                  <form action={reissueCertificate} className="mt-6">
                    <input
                      type="hidden"
                      name="certificate_id"
                      value={certificate.id}
                    />

                    <button
                      type="submit"
                      className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
                    >
                      Reissue certificate
                    </button>
                  </form>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}