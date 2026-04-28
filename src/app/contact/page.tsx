import Link from 'next/link'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <section className="bg-gradient-to-br from-slate-950 to-blue-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
            Contact
          </p>

          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Ask about lessons, courses, or student support.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
            Use this page to guide visitors toward booking support or joining
            the student portal.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Contact Flex Scholar
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Add your preferred contact details here, such as email, WhatsApp,
              or booking link.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-semibold text-slate-900">
                  your-email@example.com
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Booking</p>
                <p className="font-semibold text-slate-900">
                  Add Calendly or Google Calendar link later
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Student Portal</p>
                <Link
                  href="/login"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Create a free student account
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              What can students ask about?
            </h2>

            <div className="mt-6 space-y-4">
              {[
                'Free online training',
                '1-to-1 online lessons',
                'Computing or English support',
                'Exam preparation',
                'Course access or student dashboard help',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    ✓
                  </span>
                  <p className="font-medium text-slate-800">{item}</p>
                </div>
              ))}
            </div>

            <Link
              href="/login"
              className="mt-8 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Join Free Training
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}