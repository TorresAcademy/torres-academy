'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ProfileFormProps = {
  userId: string
  email: string
  initialValues: {
    full_name: string
    bio: string
    github_username: string
    avatar_url: string
  }
}

export default function ProfileForm({
  userId,
  email,
  initialValues,
}: ProfileFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState(initialValues.full_name)
  const [bio, setBio] = useState(initialValues.bio)
  const [githubUsername, setGithubUsername] = useState(
    initialValues.github_username
  )
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatar_url)
  const [avatarPreview, setAvatarPreview] = useState(initialValues.avatar_url)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]

    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Please upload a JPG, PNG, or WEBP image.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Profile photo must be smaller than 2MB.')
      return
    }

    setErrorMessage('')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatarIfNeeded() {
    if (!avatarFile) {
      return avatarUrl
    }

    const fileExtension = avatarFile.name.split('.').pop() || 'jpg'
    const filePath = `${userId}/avatar.${fileExtension}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

    const publicUrlWithCacheBuster = `${data.publicUrl}?v=${Date.now()}`

    setAvatarUrl(publicUrlWithCacheBuster)

    return publicUrlWithCacheBuster
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setErrorMessage('')

    try {
      const uploadedAvatarUrl = await uploadAvatarIfNeeded()

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          github_username: githubUsername.trim() || null,
          avatar_url: uploadedAvatarUrl || null,
          email: email.trim().toLowerCase(),
        })
        .eq('id', userId)

      if (error) {
        throw error
      }

      setMessage('Profile updated successfully.')
      setAvatarFile(null)
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.'
      setErrorMessage(message)
    }

    setLoading(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-6">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Profile preview"
              className="h-24 w-24 rounded-full border border-slate-200 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-3xl font-bold text-blue-700 shadow-sm">
              {(fullName || email || 'U')[0]?.toUpperCase()}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Profile photo
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-2 text-xs text-slate-500">
              JPG, PNG, or WEBP. Max 2MB.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 outline-none"
          />
          <p className="mt-2 text-xs text-slate-500">
            Email changes should be handled later from account settings.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short bio about yourself..."
            rows={5}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            GitHub username
          </label>
          <input
            type="text"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="yourgithubname"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>
      </div>

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

      <div className="mt-8">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}