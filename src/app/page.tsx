import Link from 'next/link'
import {
  BookOpen,
  CircleCheckBig,
  Laptop,
  Sparkles,
} from 'lucide-react'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'
import HeroIllustration from '@/components/hero-illustration'

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main className="bg-white text-slate-900">
        <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50 via-white to-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center">
            <div>
              <p className="inline-flex rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Online Teaching Platform
              </p>

              <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 md:text-6xl">
                Learn with confidence at{' '}
                <span className="text-blue-600">Torres Academy</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
                Simple lessons, practical learning, and short online courses designed
                to help students make real progress.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/free-training"
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Join Free Training
                </Link>

                <Link
                  href="/services"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                >
                  View Services
                </Link>
              </div>
            </div>

            <HeroIllustration />
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Clear Teaching</h3>
                <p className="mt-3 text-slate-700">
                  Lessons are structured in a simple way so students can understand
                  and apply what they learn.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Practical Learning</h3>
                <p className="mt-3 text-slate-700">
                  Focus on useful knowledge, guided practice, and small wins that
                  build confidence.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <CircleCheckBig className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Student Progress</h3>
                <p className="mt-3 text-slate-700">
                  Students can log in, follow lessons, and track what they complete
                  inside the platform.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Start Here
              </p>

              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                Begin with a free short course
              </h2>

              <p className="mt-4 text-lg text-slate-700">
                New students can start with a free training experience, explore the
                teaching style, and begin learning step by step.
              </p>

              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href="/free-training"
                  className="inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Explore Free Training
                </Link>

                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <Laptop className="h-4 w-4 text-blue-600" />
                  Student dashboard included
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-slate-900 to-blue-900 p-8 text-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.55)] md:p-10">
              <h2 className="text-3xl font-bold">
                Ready to learn with Torres Academy?
              </h2>

              <p className="mt-4 max-w-2xl text-slate-200">
                Create your account, access free training, and continue learning
                inside your student dashboard.
              </p>

              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Student Login
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}