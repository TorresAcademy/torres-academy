'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Resource = {
  id: number
  title: string
  resource_type: string
  file_url: string
}

type LessonResourcesManagerProps = {
  lessonId: number
  initialResources: Resource[]
}

export default function LessonResourcesManager({
  lessonId,
  initialResources,
}: LessonResourcesManagerProps) {
  const supabase = createClient()

  const [resources, setResources] = useState<Resource[]>(initialResources)
  const [title, setTitle] = useState('')
  const [resourceType, setResourceType] = useState('link')
  const [fileUrl, setFileUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleAddResource(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const cleanTitle = title.trim()
    const cleanUrl = fileUrl.trim()

    if (!cleanTitle) {
      setErrorMessage('Resource title is required.')
      setLoading(false)
      return
    }

    if (!cleanUrl) {
      setErrorMessage('Resource URL is required.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('resources')
      .insert({
        lesson_id: lessonId,
        title: cleanTitle,
        resource_type: resourceType,
        file_url: cleanUrl,
      })
      .select('id, title, resource_type, file_url')
      .single()

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    setResources((prev) => [data as Resource, ...prev])
    setTitle('')
    setResourceType('link')
    setFileUrl('')
    setLoading(false)
  }

  async function handleDeleteResource(resourceId: number) {
    const confirmed = window.confirm('Delete this resource?')
    if (!confirmed) return

    setErrorMessage('')

    const { error } = await supabase.from('resources').delete().eq('id', resourceId)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setResources((prev) => prev.filter((resource) => resource.id !== resourceId))
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h3 className="text-2xl font-bold text-slate-900">Lesson resources</h3>
        <p className="mt-2 text-slate-600">
          Add support links, PDFs, downloads, GitHub repos, or video resources.
        </p>
      </div>

      <form onSubmit={handleAddResource} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Resource title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson worksheet PDF"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Resource type
            </label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="link">Link</option>
              <option value="pdf">PDF</option>
              <option value="download">Download</option>
              <option value="video">Video</option>
              <option value="github">GitHub</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Resource URL
            </label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Adding...' : 'Add resource'}
        </button>
      </form>

      {errorMessage && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-8">
        <h4 className="text-lg font-bold text-slate-900">Current resources</h4>

        {resources.length === 0 ? (
          <p className="mt-4 text-slate-600">No resources added yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h5 className="font-semibold text-slate-900">{resource.title}</h5>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {resource.resource_type}
                    </span>
                  </div>

                  <a
                    href={resource.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-sm text-blue-600 underline break-all"
                  >
                    {resource.file_url}
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteResource(resource.id)}
                  className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}