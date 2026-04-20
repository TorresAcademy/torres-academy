'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type TeacherOption = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
}

type CourseFormProps = {
  mode: 'create' | 'edit'
  courseId?: number
  teachers: TeacherOption[]
  initialValues?: {
    title: string
    slug: string
    description: string
    is_free: boolean
    is_published: boolean
    teacher_id: string | null
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

export default function CourseForm({
  mode,
  courseId,
  teachers,
  initialValues,
}: CourseFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [slug, setSlug] = useState(initialValues?.slug ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [isFree, setIsFree] = useState(initialValues?.is_free ?? true)
  const [isPublished, setIsPublished] = useState(
    initialValues?.is_published ?? false
  )
  const [teacherId, setTeacherId] = useState(initialValues?.teacher_id ?? '')
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

    if (!cleanTitle) {
      setErrorMessage('Title is required.')
      setLoading(false)
      return
    }

    if (!cleanSlug) {
      setErrorMessage('Slug is required.')
      setLoading(false)
      return
    }

    const payload = {
      title: cleanTitle,
      slug: cleanSlug,
      description: description.trim(),
      is_free: isFree,
      is_published: isPublished,
      teacher_id: teacherId || null,
    }

    if (mode === 'create') {
      const { error } = await supabase.from('courses').insert(payload)

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

    router.push('/admin/courses')
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
            Course title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="English Basics"
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
            placeholder="english-basics"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Used in the URL, for example: /courses/english-basics
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Course teacher
          </label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="">Unassigned</option>

            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {(teacher.full_name || teacher.email || 'Unnamed teacher') +
                  ` (${teacher.role || 'teacher'})`}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">
            Assign this course to a teacher. Admins can still manage all courses.
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
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4"
            />
            <div>
              <p className="font-medium text-slate-900">Free course</p>
              <p className="text-sm text-slate-500">
                Keep enabled for public free training
              </p>
            </div>
          </label>

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
                Make this course visible to students
              </p>
            </div>
          </label>
        </div>
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
            ? 'Create course'
            : 'Save changes'}
        </button>

        <Link
          href="/admin/courses"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}