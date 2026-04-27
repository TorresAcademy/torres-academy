// src/components/teacher/teacher-course-form.tsx
'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Eye,
  Globe2,
  Lock,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type CourseStatus = 'draft' | 'published' | 'archived'

type TeacherCourseFormProps = {
  mode: 'create' | 'edit'
  ownerId: string
  courseId?: number
  initialValues?: {
    title: string
    slug: string
    description: string
    is_free: boolean
    is_published: boolean
    status?: CourseStatus | null
    enrollment_opens_at?: string | null
    enrollment_closes_at?: string | null
    course_starts_at?: string | null
    course_ends_at?: string | null
    recommended_duration_label?: string | null
  }
}

const DURATION_OPTIONS = [
  '',
  '1 week',
  '2 weeks',
  '1 month',
  '2 months',
  '3 months',
  '6 months',
  '1 year',
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(date.getTime() - offsetMs)

  return localDate.toISOString().slice(0, 16)
}

function toIsoOrNull(value: string) {
  if (!value.trim()) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
          {icon}
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  )
}

export default function TeacherCourseForm({
  mode,
  ownerId,
  courseId,
  initialValues,
}: TeacherCourseFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [slug, setSlug] = useState(initialValues?.slug ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [isFree, setIsFree] = useState(initialValues?.is_free ?? true)

  const [status, setStatus] = useState<CourseStatus>(
    initialValues?.status ??
      (initialValues?.is_published ? 'published' : 'draft')
  )

  const [recommendedDurationLabel, setRecommendedDurationLabel] = useState(
    initialValues?.recommended_duration_label ?? ''
  )

  const [enrollmentOpensAt, setEnrollmentOpensAt] = useState(
    toDateTimeLocal(initialValues?.enrollment_opens_at)
  )
  const [enrollmentClosesAt, setEnrollmentClosesAt] = useState(
    toDateTimeLocal(initialValues?.enrollment_closes_at)
  )
  const [courseStartsAt, setCourseStartsAt] = useState(
    toDateTimeLocal(initialValues?.course_starts_at)
  )
  const [courseEndsAt, setCourseEndsAt] = useState(
    toDateTimeLocal(initialValues?.course_ends_at)
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
    const cleanDescription = description.trim()

    if (!cleanTitle) {
      setErrorMessage('Course title is required.')
      setLoading(false)
      return
    }

    if (!cleanSlug) {
      setErrorMessage('Slug is required.')
      setLoading(false)
      return
    }

    const enrollmentOpensIso = toIsoOrNull(enrollmentOpensAt)
    const enrollmentClosesIso = toIsoOrNull(enrollmentClosesAt)
    const courseStartsIso = toIsoOrNull(courseStartsAt)
    const courseEndsIso = toIsoOrNull(courseEndsAt)

    if (
      enrollmentOpensIso &&
      enrollmentClosesIso &&
      enrollmentOpensIso > enrollmentClosesIso
    ) {
      setErrorMessage('Enrollment closing date must be after the opening date.')
      setLoading(false)
      return
    }

    if (courseStartsIso && courseEndsIso && courseStartsIso > courseEndsIso) {
      setErrorMessage('Course end date must be after the start date.')
      setLoading(false)
      return
    }

    const payload = {
      title: cleanTitle,
      slug: cleanSlug,
      description: cleanDescription || null,
      is_free: isFree,
      status,
      is_published: status === 'published',
      enrollment_opens_at: enrollmentOpensIso,
      enrollment_closes_at: enrollmentClosesIso,
      course_starts_at: courseStartsIso,
      course_ends_at: courseEndsIso,
      recommended_duration_label: recommendedDurationLabel || null,
    }

    if (mode === 'create') {
      const { error } = await supabase.from('courses').insert({
        ...payload,
        teacher_id: ownerId,
      })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('courses')
        .update(payload)
        .eq('id', courseId)

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }
    }

    router.push('/teacher/courses')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionCard
        title="Course basics"
        description="Set the course title, slug, and summary students will understand."
        icon={<BookOpen className="h-5 w-5" />}
      >
        <div className="grid gap-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Course title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="English Foundations"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
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
              placeholder="english-foundations"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
            <p className="mt-2 text-sm text-slate-500">
              This becomes the course URL path.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short free course for beginner students."
              rows={5}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Lifecycle and visibility"
        description="Control whether the course is a draft, live, or archived, and whether it appears in the free catalog."
        icon={<Settings2 className="h-5 w-5" />}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Course lifecycle
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CourseStatus)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <p className="mt-2 text-sm text-slate-500">
              Published courses stay visible to students. Archived courses stay
              hidden from normal browsing.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Recommended duration
            </label>
            <select
              value={recommendedDurationLabel}
              onChange={(e) => setRecommendedDurationLabel(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option || 'none'} value={option}>
                  {option || 'No duration set'}
                </option>
              ))}
            </select>

            <p className="mt-2 text-sm text-slate-500">
              This is a planning label for now, not a hard deadline yet.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <div>
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-amber-700" />
                <p className="font-medium text-slate-900">Free course</p>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Visible in the free catalog.
              </p>
            </div>
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              {status === 'published' ? (
                <Eye className="h-4 w-4 text-emerald-700" />
              ) : (
                <Lock className="h-4 w-4 text-slate-600" />
              )}
              <p className="font-medium text-slate-900">Visibility rule</p>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              The course is student-visible only when lifecycle is set to
              published.
            </p>

            <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {status === 'published' ? 'Currently visible to students' : 'Currently hidden from students'}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Seasonal timing"
        description="Set enrollment and teaching windows for the course."
        icon={<CalendarDays className="h-5 w-5" />}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Enrollment opens
            </label>
            <input
              type="datetime-local"
              value={enrollmentOpensAt}
              onChange={(e) => setEnrollmentOpensAt(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Enrollment closes
            </label>
            <input
              type="datetime-local"
              value={enrollmentClosesAt}
              onChange={(e) => setEnrollmentClosesAt(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Course starts
            </label>
            <input
              type="datetime-local"
              value={courseStartsAt}
              onChange={(e) => setCourseStartsAt(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Course ends
            </label>
            <input
              type="datetime-local"
              value={courseEndsAt}
              onChange={(e) => setCourseEndsAt(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-amber-700" />
            <p className="font-medium text-slate-900">Timing note</p>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Enrollment dates control when students can join. Course dates help
            define the teaching season and pacing window.
          </p>
        </div>
      </SectionCard>

      {errorMessage && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {mode === 'create' ? 'Ready to create this course?' : 'Ready to save your changes?'}
              </p>
              <p className="text-sm text-slate-500">
                You can always return later to update lessons, modules, and visibility.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black disabled:opacity-60"
            >
              {loading
                ? 'Saving...'
                : mode === 'create'
                ? 'Create course'
                : 'Save changes'}
            </button>

            <Link
              href="/teacher/courses"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
            >
              Cancel
            </Link>
          </div>
        </div>
      </section>
    </form>
  )
}