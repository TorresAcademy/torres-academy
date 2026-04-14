import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type CoursePageProps = {
  params: Promise<{ slug: string }>
}

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
}

type Lesson = {
  id: number
  title: string
  slug: string
  position: number
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug, description')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (courseError || !course) {
    notFound()
  }

  const typedCourse = course as Course

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, slug, position')
    .eq('course_id', typedCourse.id)
    .eq('is_published', true)
    .order('position', { ascending: true })

  if (lessonsError) {
    console.error('Error loading lessons:', lessonsError.message)
  }

  const safeLessons = (lessons ?? []) as Lesson[]

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm underline">
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 text-3xl font-bold">{typedCourse.title}</h1>
        <p className="mt-3 text-gray-700">
          {typedCourse.description || 'No description yet.'}
        </p>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold">Lessons</h2>

          {safeLessons.length === 0 ? (
            <div className="mt-4 rounded-2xl border p-6">
              <p>No lessons published yet.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {safeLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-2xl border p-4"
                >
                  <div>
                    <p className="text-sm text-gray-500">Lesson {lesson.position}</p>
                    <h3 className="font-semibold">{lesson.title}</h3>
                  </div>

                  <Link
                    href={`/lessons/${lesson.slug}`}
                    className="rounded-lg border px-4 py-2 font-medium"
                  >
                    Open lesson
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}