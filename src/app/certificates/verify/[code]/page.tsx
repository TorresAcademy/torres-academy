import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type VerifyCertificatePageProps = {
  params: Promise<{ code: string }>
}

type VerificationResult = {
  found: boolean
  valid: boolean
  message?: string
  certificateId?: number
  verificationCode?: string
  status?: string
  issuedAt?: string
  revokedAt?: string | null
  revokedReason?: string | null
  studentName?: string
  courseTitle?: string
  courseSlug?: string
}

export default async function VerifyCertificatePage({
  params,
}: VerifyCertificatePageProps) {
  const { code } = await params
  const supabase = await createClient()

  const { data } = await supabase.rpc('verify_certificate', {
    input_code: code,
  })

  const result = data as VerificationResult | null

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="text-2xl font-bold text-slate-900">
          Torres <span className="text-blue-600">Academy</span>
        </Link>

        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Certificate Verification
          </p>

          {!result || !result.found ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
              <h1 className="text-3xl font-bold text-red-700">
                Certificate not found
              </h1>

              <p className="mt-3 text-slate-700">
                This verification code does not match any certificate.
              </p>
            </div>
          ) : (
            <div
              className={`mt-6 rounded-2xl border p-6 ${
                result.valid
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <h1
                className={`text-3xl font-bold ${
                  result.valid ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {result.valid ? 'Certificate is valid' : 'Certificate revoked'}
              </h1>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Student
                  </p>
                  <p className="mt-2 font-bold text-slate-900">
                    {result.studentName}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Course
                  </p>
                  <p className="mt-2 font-bold text-slate-900">
                    {result.courseTitle}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Issued
                  </p>
                  <p className="mt-2 font-bold text-slate-900">
                    {result.issuedAt
                      ? new Date(result.issuedAt).toLocaleDateString()
                      : '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Verification code
                  </p>
                  <p className="mt-2 break-all font-bold text-slate-900">
                    {result.verificationCode}
                  </p>
                </div>
              </div>

              {!result.valid && result.revokedReason && (
                <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-red-700">
                  Reason: {result.revokedReason}
                </p>
              )}
            </div>
          )}

          <div className="mt-8">
            <Link
              href="/"
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}