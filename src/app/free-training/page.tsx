import Link from 'next/link'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'
import { createClient } from '@/lib/supabase/server'

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
}

export default async function FreeTrainingPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('courses')
    .select('id, title, slug, description')
    .eq('is_published', true)
    .eq('is_free', true)
    .order('created_at', { ascending: false })

  const courses = (data ?? []) as Course[]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Free Training
          </p>

          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Start learning with free online courses.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Create a free account, enroll in a course, and continue lessons from
            your student dashboard.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Join Free
            </Link>

            <Link
              href="/services"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              View Services
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                Available free courses
              </h2>
              <p className="mt-2 text-slate-600">
                Published free courses students can join.
              </p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No free courses are published yet. Please check again soon.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-2xl font-bold text-slate-900">
                    {course.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {course.description || 'No description yet.'}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      View course
                    </Link>

                    <Link
                      href="/login"
                      className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                    >
                      Enroll free
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}