import Link from 'next/link'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <section className="overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-200">
              Online Teaching Platform
            </p>

            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
              Learn with confidence at Torres Academy
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Simple lessons, practical training, and guided support designed to
              help students make real progress one step at a time.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/free-training"
                className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Start Free Training
              </Link>

              <Link
                href="/services"
                className="rounded-xl border border-white/25 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                View Services
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-3xl font-bold">Free</p>
                <p className="mt-1 text-sm text-slate-300">
                  starter lessons
                </p>
              </div>

              <div>
                <p className="text-3xl font-bold">Online</p>
                <p className="mt-1 text-sm text-slate-300">
                  student dashboard
                </p>
              </div>

              <div>
                <p className="text-3xl font-bold">Guided</p>
                <p className="mt-1 text-sm text-slate-300">
                  teacher support
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="rounded-3xl bg-white p-6 text-slate-900">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Student Portal
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                What students get
              </h2>

              <div className="mt-6 space-y-4">
                {[
                  'Short, clear online lessons',
                  'Free courses to get started',
                  'Personal learning dashboard',
                  'Progress tracking',
                  'Teacher-created content',
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
                className="mt-6 block rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
              >
                Join the free portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Why Torres Academy
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Built for simple, steady progress
            </h2>
            <p className="mt-4 text-slate-600">
              The goal is not to overwhelm students. The goal is to give them a
              clear path, useful lessons, and a system that helps them continue.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Clear lessons',
                text: 'Lessons are short, structured, and easy to follow.',
              },
              {
                title: 'Student dashboard',
                text: 'Students can enroll, continue learning, and track progress.',
              },
              {
                title: 'Teacher support',
                text: 'Teachers can manage courses, lessons, and student progress.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-700">
                  ✦
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Free Training
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                Start with free lessons before booking support
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Students can register for free, enroll in available courses, and
                begin learning immediately.
              </p>

              <Link
                href="/free-training"
                className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Explore free training
              </Link>
            </div>

            <div className="grid gap-4">
              {[
                'Register for a free student account',
                'Choose a published free course',
                'Complete lessons at your own pace',
                'Track progress from your dashboard',
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="font-medium text-slate-800">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Services
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Learning support for students and families
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: '1-to-1 Online Lessons',
                text: 'Personal support for students who need guided help.',
              },
              {
                title: 'Course-Based Training',
                text: 'Structured online courses with lessons and progress tracking.',
              },
              {
                title: 'Exam / Skills Support',
                text: 'Focused preparation for specific topics, skills, or goals.',
              },
            ].map((service) => (
              <div
                key={service.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-bold text-slate-900">
                  {service.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {service.text}
                </p>
                <Link
                  href="/contact"
                  className="mt-5 inline-block font-semibold text-blue-600 hover:underline"
                >
                  Ask about this →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                Ready to start?
              </p>
              <h2 className="mt-3 text-3xl font-bold">
                Create your free student account today.
              </h2>
              <p className="mt-4 text-slate-300">
                Join the portal, enroll in free training, and begin your learning
                journey with Torres Academy.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 md:justify-end">
              <Link
                href="/login"
                className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Join Free
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-white/25 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Contact Torres Academy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}