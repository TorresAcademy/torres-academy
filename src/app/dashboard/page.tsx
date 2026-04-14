import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, slug, description')
    .eq('is_published', true)
    .eq('is_free', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading courses:', error.message)
  }

  const safeCourses = (courses ?? []) as Course[]

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Welcome, {user.email}</p>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold">Free Courses</h2>

          {safeCourses.length === 0 ? (
            <div className="mt-4 rounded-2xl border p-6">
              <p>No courses published yet.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {safeCourses.map((course) => (
                <article key={course.id} className="rounded-2xl border p-5 shadow-sm">
                  <h3 className="text-xl font-semibold">{course.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {course.description || 'No description yet.'}
                  </p>

                  <Link
                    href={`/courses/${course.slug}`}
                    className="mt-4 inline-block rounded-lg border px-4 py-2 font-medium"
                  >
                    Start course
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}