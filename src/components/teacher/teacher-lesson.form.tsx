'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type CourseOption = {
  id: number
  title: string
}

type TeacherLessonFormProps = {
  mode: 'create' | 'edit'
  lessonId?: number
  courses: CourseOption[]
  initialValues?: {
    course_id: number
    title: string
    slug: string
    content: string
    video_url: string
    position: number
    is_published: boolean
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function TeacherLessonForm({
  mode,
  lessonId,
  courses,
  initialValues,
}: TeacherLessonFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [courseId, setCourseId] = useState(
    initialValues?.course_id
      ? String(initialValues.course_id)
      : courses[0]
      ? String(courses[0].id)
      : ''
  )

  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [slug, setSlug] = useState(initialValues?.slug ?? '')
  const [content, setContent] = useState(initialValues?.content ?? '')
  const [videoUrl, setVideoUrl] = useState(initialValues?.video_url ?? '')
  const [position, setPosition] = useState(
    initialValues?.position ? String(initialValues.position) : '1'
  )
  const [isPublished, setIsPublished] = useState(
    initialValues?.is_published ?? false
  )
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues?.slug))

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(title))
    }
  }, [title, slugTouched])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const cleanTitle = title.trim()
    const cleanSlug = slugify(slug)
    const cleanCourseId = Number(courseId)
    const cleanPosition = Number(position)

    if (!cleanCourseId) {
      setErrorMessage('Please select a course.')
      setLoading(false)
      return
    }

    if (!cleanTitle) {
      setErrorMessage('Lesson title is required.')
      setLoading(false)
      return
    }

    if (!cleanSlug) {
      setErrorMessage('Slug is required.')
      setLoading(false)
      return
    }

    if (!cleanPosition || cleanPosition < 1) {
      setErrorMessage('Position must be 1 or higher.')
      setLoading(false)
      return
    }

    const payload = {
      course_id: cleanCourseId,
      title: cleanTitle,
      slug: cleanSlug,
      content: content.trim(),
      video_url: videoUrl.trim() || null,
      position: cleanPosition,
      is_published: isPublished,
    }

    if (mode === 'create') {
      const { error } = await supabase.from('lessons').insert(payload)

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('lessons')
        .update(payload)
        .eq('id', lessonId)

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }
    }

    router.push('/teacher/lessons')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Course
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Lesson title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson 1: Introduce Yourself"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            placeholder="introduce-yourself"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Position
          </label>
          <input
            type="number"
            min="1"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Video URL
          </label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Lesson content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the lesson content here..."
            rows={10}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4"
          />
          <div>
            <p className="font-medium text-slate-900">Published</p>
            <p className="text-sm text-slate-500">
              Make this lesson visible to students
            </p>
          </div>
        </label>
      </div>

      {errorMessage && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading
            ? 'Saving...'
            : mode === 'create'
            ? 'Create lesson'
            : 'Save changes'}
        </button>

        <Link
          href="/teacher/lessons"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}