import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  FileVideo,
  Image as ImageIcon,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import LessonMediaManager from '@/components/teacher/lesson-media-manager'

type TeacherLessonMediaPageProps = {
  params: Promise<{ id: string }>
}

type MediaItemRow = {
  id: string
  title: string | null
  description: string | null
  media_path: string
  media_type: string
  mime_type: string | null
  original_name: string | null
  position: number
  is_published: boolean
}

function InfoCard({
  title,
  description,
  icon,
  tone = 'white',
}: {
  title: string
  description: string
  icon: ReactNode
  tone?: 'white' | 'amber' | 'slate'
}) {
  const tones = {
    white: 'border-slate-200 bg-white',
    amber: 'border-amber-200 bg-amber-50',
    slate: 'border-slate-200 bg-slate-50',
  } as const

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
          {icon}
        </div>

        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default async function TeacherLessonMediaPage({
  params,
}: TeacherLessonMediaPageProps) {
  const { id } = await params
  const lessonId = Number(id)

  if (!lessonId || Number.isNaN(lessonId)) {
    notFound()
  }

  const { user, profile } = await requireTeacherOrAdmin()
  const serviceSupabase = createServiceRoleClient()

  const { data: lesson } = await serviceSupabase
    .from('lessons')
    .select(
      'id, title, slug, course_id, media_path, media_type, media_original_name, media_mime_type'
    )
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson) {
    notFound()
  }

  const { data: course } = await serviceSupabase
    .from('courses')
    .select('id, title, teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle()

  if (!course) {
    notFound()
  }

  const isAdmin = profile.role === 'admin'
  const canManage = isAdmin || course.teacher_id === user.id

  if (!canManage) {
    notFound()
  }

  const { data: mediaRows } = await serviceSupabase
    .from('lesson_media_items')
    .select(
      'id, title, description, media_path, media_type, mime_type, original_name, position, is_published'
    )
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  const mediaItems = await Promise.all(
    ((mediaRows ?? []) as MediaItemRow[]).map(async (item) => {
      const { data } = await serviceSupabase.storage
        .from('lesson-media')
        .createSignedUrl(item.media_path, 60 * 20)

      return {
        id: String(item.id),
        title: item.title,
        description: item.description,
        mediaPath: item.media_path,
        mediaType: item.media_type,
        mimeType: item.mime_type,
        originalName: item.original_name,
        position: item.position,
        isPublished: item.is_published,
        signedUrl: data?.signedUrl ?? null,
      }
    })
  )

  const imageCount = mediaItems.filter((item) => item.mediaType === 'image').length
  const videoCount = mediaItems.filter((item) => item.mediaType === 'video').length
  const pdfCount = mediaItems.filter((item) => item.mediaType === 'pdf').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/teacher/lessons/${lesson.id}/edit`}
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
        >
          ← Back to lesson editor
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Lesson Media Slides
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              {lesson.title}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Upload multiple protected images, PDFs, and videos. Students will
              see them as accordion-style lesson slides.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Multi-slide media manager
                </p>
                <p className="text-sm text-slate-300">
                  Secure lesson resources with signed URLs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          title="Protected storage"
          description="Students do not receive the raw storage path. Access is controlled through signed URLs."
          icon={<Lock className="h-5 w-5" />}
          tone="amber"
        />

        <InfoCard
          title="Accordion slides"
          description={`${mediaItems.length} slide/resource item(s): ${imageCount} image(s), ${videoCount} video(s), ${pdfCount} PDF(s).`}
          icon={<Layers className="h-5 w-5" />}
          tone="slate"
        />

        <InfoCard
          title="Access checks"
          description="The lesson page validates login, enrollment, and lesson access before media is shown."
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </section>

      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-slate-700 shadow-sm">
        <p className="font-semibold text-slate-900">Protected media note</p>
        <p className="mt-1">
          Uploaded files remain in the private <span className="font-semibold">lesson-media</span> bucket.
          The student lesson page creates temporary signed URLs only after login,
          enrollment, and lesson access checks.
        </p>
      </section>

      <LessonMediaManager
        userId={user.id}
        lessonId={lesson.id}
        mediaItems={mediaItems}
      />
    </div>
  )
}
