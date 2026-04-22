import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrintCertificateButton from '@/components/certificates/print-certificate-button'

type CertificatePageProps = {
  params: Promise<{ id: string }>
}

export default async function CertificatePage({ params }: CertificatePageProps) {
  const { id } = await params
  const certificateId = Number(id)

  if (!certificateId || Number.isNaN(certificateId)) {
    notFound()
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/certificates/${certificateId}`)
  }

  const { data: certificate } = await supabase
    .from('certificates')
    .select('id, user_id, course_id, verification_code, status, issued_at')
    .eq('id', certificateId)
    .maybeSingle()

  if (!certificate) {
    notFound()
  }

  const { data: student } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', certificate.user_id)
    .maybeSingle()

  const { data: course } = await supabase
    .from('courses')
    .select('title, slug')
    .eq('id', certificate.course_id)
    .maybeSingle()

  if (!course) {
    notFound()
  }

  const issuedDate = new Date(certificate.issued_at).toLocaleDateString()

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link
            href="/certificates"
            className="text-sm font-medium text-blue-600 underline"
          >
            ← Back to certificates
          </Link>

          <div className="flex flex-wrap gap-3">
            <PrintCertificateButton />

            <Link
              href={`/certificates/verify/${certificate.verification_code}`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              Public verification
            </Link>
          </div>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm print:border-0 print:shadow-none">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
              Torres Academy
            </p>

            <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-900">
              Certificate of Completion
            </h1>

            <p className="mt-8 text-lg text-slate-600">
              This certificate is proudly presented to
            </p>

            <h2 className="mt-4 text-4xl font-bold text-blue-700">
              {student?.full_name || student?.email || 'Student'}
            </h2>

            <p className="mt-8 text-lg leading-8 text-slate-700">
              for successfully completing the course
            </p>

            <h3 className="mt-4 text-3xl font-bold text-slate-900">
              {course.title}
            </h3>

            <p className="mt-8 text-slate-600">
              Completion requirements verified: lessons completed, reflections
              submitted, and final quizzes passed.
            </p>

            <div className="mt-10 grid gap-4 border-t border-slate-200 pt-8 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Issued
                </p>
                <p className="mt-2 font-bold text-slate-900">{issuedDate}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 font-bold text-green-700">
                  {certificate.status}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Verification code
                </p>
                <p className="mt-2 break-all font-bold text-slate-900">
                  {certificate.verification_code}
                </p>
              </div>
            </div>

            <div className="mt-12">
              <p className="text-sm text-slate-500">Authorized by</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                Torres Academy
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}