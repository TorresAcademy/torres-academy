'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type CurrentMedia = {
  signedUrl: string | null
  mediaType: string | null
  mimeType: string | null
  originalName: string | null
}

type LessonMediaManagerProps = {
  userId: string
  lessonId: number
  currentMedia: CurrentMedia
}

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
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

export default function LessonMediaManager({
  userId,
  lessonId,
  currentMedia,
}: LessonMediaManagerProps) {
  const supabase = createClient()
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]

    setMessage('')
    setErrorMessage('')

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (!allowedMimeTypes.includes(selectedFile.type)) {
      setErrorMessage('Please upload JPG, PNG, WEBP, MP4, WEBM, or MOV.')
      setFile(null)
      return
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setErrorMessage('File must be smaller than 100MB.')
      setFile(null)
      return
    }

    setFile(selectedFile)
  }

  async function uploadMedia() {
    if (!file) {
      setErrorMessage('Choose a file first.')
      return
    }

    setLoading(true)
    setMessage('')
    setErrorMessage('')

    const path = `${userId}/lessons/${lessonId}/${Date.now()}-${safeFileName(
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
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      await supabase.storage.from('lesson-media').remove([path])
      setErrorMessage(data.error || 'Could not save media to lesson.')
      setLoading(false)
      return
    }

    setMessage('Lesson media uploaded successfully.')
    setFile(null)
    setLoading(false)
    router.refresh()
  }

  async function removeMedia() {
    setRemoving(true)
    setMessage('')
    setErrorMessage('')

    const response = await fetch('/api/teacher/lesson-media', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setErrorMessage(data.error || 'Could not remove media.')
      setRemoving(false)
      return
    }

    setMessage('Lesson media removed.')
    setRemoving(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">
          Current lesson media
        </h3>

        {!currentMedia.signedUrl ? (
          <p className="mt-4 text-slate-700">
            No media has been uploaded for this lesson yet.
          </p>
        ) : (
          <div className="mt-6">
            {currentMedia.mediaType === 'video' ? (
              <video
                src={currentMedia.signedUrl}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                className="aspect-video w-full rounded-3xl bg-black"
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <div
                className="rounded-3xl bg-slate-950 p-4"
                onContextMenu={(e) => e.preventDefault()}
              >
                <img
                  src={currentMedia.signedUrl}
                  alt={currentMedia.originalName || 'Lesson media'}
                  draggable={false}
                  className="mx-auto max-h-[520px] rounded-2xl object-contain"
                />
              </div>
            )}

            <p className="mt-3 text-sm text-slate-600">
              {currentMedia.originalName || 'Lesson media'}
            </p>

            <button
              type="button"
              onClick={removeMedia}
              disabled={removing}
              className="mt-4 rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              {removing ? 'Removing...' : 'Remove media'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">
          Upload protected media
        </h3>

        <p className="mt-3 text-slate-600">
          Upload one image or video for this lesson. Students will only receive a
          temporary signed viewing link after access checks.
        </p>

        <div className="mt-6">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
          />

          <p className="mt-2 text-xs text-slate-500">
            Allowed: JPG, PNG, WEBP, MP4, WEBM, MOV. Max 100MB.
          </p>
        </div>

        {file && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            Selected: <span className="font-semibold">{file.name}</span>
          </div>
        )}

        {message && (
          <p className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </p>
        )}

        {errorMessage && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={uploadMedia}
          disabled={loading || !file}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Uploading...' : 'Upload media'}
        </button>
      </div>
    </div>
  )
}