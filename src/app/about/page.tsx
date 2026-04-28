import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            About Flex Scholar
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Practical online teaching with a clear learning path.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Flex Scholar is designed to help students learn through short,
            clear lessons, guided support, and a personal dashboard where they can
            track their progress.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-12 md:grid-cols-3">
          {[
            {
              title: 'Simple',
              text: 'Lessons are organized so students know what to do next.',
            },
            {
              title: 'Practical',
              text: 'Training focuses on useful skills and steady improvement.',
            },
            {
              title: 'Supportive',
              text: 'Students can receive guided help when they need it.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}