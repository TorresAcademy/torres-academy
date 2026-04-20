import Link from 'next/link'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'

export default function ServicesPage() {
  const services = [
    {
      title: '1-to-1 Online Lessons',
      text: 'Personalized lessons for students who need direct support, explanation, and guided practice.',
    },
    {
      title: 'Free Training Courses',
      text: 'Introductory courses that help students get started through the online portal.',
    },
    {
      title: 'Exam and Skills Support',
      text: 'Focused help for specific topics, exam preparation, computing, English, or study skills.',
    },
    {
      title: 'Course-Based Learning',
      text: 'Structured lessons that students can complete step by step with progress tracking.',
    },
  ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <section className="bg-gradient-to-br from-slate-950 to-blue-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
            Services
          </p>

          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Online learning support designed around student progress.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
            Choose free training, guided lessons, or focused academic support.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-14 md:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-bold text-slate-900">
                {service.title}
              </h2>

              <p className="mt-4 leading-7 text-slate-600">{service.text}</p>

              <Link
                href="/contact"
                className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Ask about this service
              </Link>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}