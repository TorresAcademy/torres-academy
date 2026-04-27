'use client'

import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Lock,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type MediaItem = {
  id: string
  title: string | null
  description: string | null
  mediaPath: string
  mediaType: string
  mimeType: string | null
  originalName: string | null
  position: number
  isPublished: boolean
  signedUrl: string | null
}

type LessonMediaManagerProps = {
  userId: string
  lessonId: number
  mediaItems: MediaItem[]
}

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
}

function getMediaType(mimeType: string) {
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  return 'file'
}

function InfoPill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'success' | 'warning'
}) {
  const toneClasses = {
    default: 'border-slate-200 bg-white text-slate-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  } as const

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}

function MediaPreview({ item }: { item: MediaItem }) {
  const label = item.title || item.originalName || 'Lesson media'

  if (!item.signedUrl) {
    return (
      <div className="flex h-52 items-center justify-center rounded-3xl bg-slate-100 text-sm text-slate-600">
        Signed preview unavailable
      </div>
    )
  }

  if (item.mediaType === 'video') {
    return (
      <video
        src={item.signedUrl}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        className="aspect-video w-full rounded-3xl bg-black"
        onContextMenu={(e) => e.preventDefault()}
      />
    )
  }

  if (item.mediaType === 'pdf') {
    return (
      <iframe
        src={item.signedUrl}
        title={label}
        className="h-80 w-full rounded-3xl border border-slate-200 bg-white"
      />
    )
  }

  return (
    <div
      className="rounded-3xl bg-slate-950 p-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      <img
        src={item.signedUrl}
        alt={label}
        draggable={false}
        className="mx-auto max-h-[420px] rounded-2xl object-contain"
      />
    </div>
  )
}

export default function LessonMediaManager({
  userId,
  lessonId,
  mediaItems,
}: LessonMediaManagerProps) {
  const supabase = createClient()
  const router = useRouter()

  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [position, setPosition] = useState(mediaItems.length + 1)
  const [isPublished, setIsPublished] = useState(true)

  const [loading, setLoading] = useState(false)
  const [busyItemId, setBusyItemId] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? [])

    setMessage('')
    setErrorMessage('')

    if (selectedFiles.length === 0) {
      setFiles([])
      return
    }

    const invalidFile = selectedFiles.find(
      (selectedFile) => !allowedMimeTypes.includes(selectedFile.type)
    )

    if (invalidFile) {
      setErrorMessage(
        'Please upload JPG, PNG, WEBP, PDF, MP4, WEBM, or MOV files only.'
      )
      setFiles([])
      return
    }

    const tooLarge = selectedFiles.find(
      (selectedFile) => selectedFile.size > 100 * 1024 * 1024
    )

    if (tooLarge) {
      setErrorMessage('Each file must be smaller than 100MB.')
      setFiles([])
      return
    }

    setFiles(selectedFiles)
  }

  async function uploadMedia() {
    if (files.length === 0) {
      setErrorMessage('Choose at least one file first.')
      return
    }

    setLoading(true)
    setMessage('')
    setErrorMessage('')

    let nextPosition = position || mediaItems.length + 1

    for (const file of files) {
      const path = `${userId}/lessons/${lessonId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(
        file.name
      )}`

      const { error: uploadError } = await supabase.storage
        .from('lesson-media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        setErrorMessage(uploadError.message)
        setLoading(false)
        return
      }

      const response = await fetch('/api/teacher/lesson-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          mediaPath: path,
          mediaMimeType: file.type,
          originalName: file.name,
          title: files.length === 1 ? title : file.name,
          description,
          position: nextPosition,
          isPublished,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        await supabase.storage.from('lesson-media').remove([path])
        setErrorMessage(data.error || 'Could not save media slide.')
        setLoading(false)
        return
      }

      nextPosition += 1
    }

    setMessage('Lesson media slide(s) uploaded successfully.')
    setFiles([])
    setTitle('')
    setDescription('')
    setPosition(nextPosition)
    setLoading(false)
    router.refresh()
  }

  async function updateMediaItem(item: MediaItem, formData: FormData) {
    setBusyItemId(item.id)
    setMessage('')
    setErrorMessage('')

    const response = await fetch('/api/teacher/lesson-media', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonId,
        mediaItemId: item.id,
        title: String(formData.get('title') || ''),
        description: String(formData.get('description') || ''),
        position: Number(formData.get('position') || 1),
        isPublished: formData.get('is_published') === 'on',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setErrorMessage(data.error || 'Could not update media slide.')
      setBusyItemId('')
      return
    }

    setMessage('Media slide updated.')
    setBusyItemId('')
    router.refresh()
  }

  async function removeMediaItem(item: MediaItem) {
    setBusyItemId(item.id)
    setMessage('')
    setErrorMessage('')

    const response = await fetch('/api/teacher/lesson-media', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonId,
        mediaItemId: item.id,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setErrorMessage(data.error || 'Could not remove media slide.')
      setBusyItemId('')
      return
    }

    setMessage('Media slide removed.')
    setBusyItemId('')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              Current lesson slides
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              These protected resources appear to students as accordion slides.
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
            <Lock className="h-5 w-5" />
          </div>
        </div>

        {mediaItems.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-slate-700">
              No media slides have been uploaded for this lesson yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {mediaItems.map((item) => (
              <article
                key={item.id}
                className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5"
              >
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <InfoPill tone={item.isPublished ? 'success' : 'warning'}>
                        {item.isPublished ? 'Published' : 'Draft'}
                      </InfoPill>

                      <InfoPill>
                        {item.mediaType === 'video'
                          ? 'Video'
                          : item.mediaType === 'pdf'
                            ? 'PDF'
                            : 'Image'}
                      </InfoPill>

                      <InfoPill>Position {item.position}</InfoPill>

                      {item.mimeType ? <InfoPill>{item.mimeType}</InfoPill> : null}
                    </div>

                    <MediaPreview item={item} />
                  </div>

                  <form
                    action={(formData) => updateMediaItem(item, formData)}
                    className="rounded-3xl border border-slate-200 bg-white p-5"
                  >
                    <div className="grid gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Slide title
                        </label>
                        <input
                          name="title"
                          defaultValue={item.title ?? ''}
                          placeholder={item.originalName || 'Lesson slide'}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Position
                        </label>
                        <input
                          name="position"
                          type="number"
                          min="1"
                          defaultValue={item.position}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Description
                        </label>
                        <textarea
                          name="description"
                          rows={4}
                          defaultValue={item.description ?? ''}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                        />
                      </div>

                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <input
                          name="is_published"
                          type="checkbox"
                          defaultChecked={item.isPublished}
                          className="h-4 w-4"
                        />
                        <div>
                          <p className="font-medium text-slate-900">
                            Published
                          </p>
                          <p className="text-sm text-slate-500">
                            Show this slide to students
                          </p>
                        </div>
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={busyItemId === item.id}
                          className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-amber-300 transition hover:bg-black disabled:opacity-60"
                        >
                          {busyItemId === item.id ? 'Saving...' : 'Save slide'}
                        </button>

                        <button
                          type="button"
                          onClick={() => removeMediaItem(item)}
                          disabled={busyItemId === item.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              Upload protected media slides
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Upload one or more images, PDFs, or videos. Each file becomes one
              accordion slide in the student lesson.
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
            <UploadCloud className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Images</p>
            <p className="mt-1 text-sm text-slate-600">JPG, PNG, WEBP</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">PDF</p>
            <p className="mt-1 text-sm text-slate-600">Worksheets / slides</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Videos</p>
            <p className="mt-1 text-sm text-slate-600">MP4, WEBM, MOV</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Max size</p>
            <p className="mt-1 text-sm text-slate-600">100 MB each</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Slide title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Used when uploading one file"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Starting position
            </label>
            <input
              type="number"
              min="1"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value || 1))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note shown inside the accordion slide"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
          />
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4"
          />
          <div>
            <p className="font-medium text-slate-900">Published</p>
            <p className="text-sm text-slate-500">
              Uploaded slide(s) will be visible to students.
            </p>
          </div>
        </label>

        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-amber-300 hover:file:bg-black"
          />

          <p className="mt-3 text-xs text-slate-500">
            Allowed: JPG, PNG, WEBP, PDF, MP4, WEBM, MOV. Max 100MB each.
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              Selected file{files.length === 1 ? '' : 's'}:
            </p>
            <ul className="mt-2 list-inside list-disc">
              {files.map((selectedFile) => (
                <li key={`${selectedFile.name}-${selectedFile.size}`}>
                  {selectedFile.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{message}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-amber-700" />
            <div>
              <p className="font-medium text-slate-900">Protected delivery</p>
              <p className="text-sm text-slate-600">
                Storage paths stay private and access is delivered through
                temporary signed URLs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={uploadMedia}
            disabled={loading || files.length === 0}
            className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black disabled:opacity-60"
          >
            {loading ? 'Uploading...' : 'Upload slide(s)'}
          </button>
        </div>
      </section>
    </div>
  )
}
