import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

type SaveMediaBody = {
  lessonId: number
  mediaPath: string
  mediaMimeType: string
  originalName: string
  title?: string
  description?: string
  position?: number
  isPublished?: boolean
}

type UpdateMediaBody = {
  mediaItemId: string
  lessonId: number
  title?: string
  description?: string
  position?: number
  isPublished?: boolean
}

type DeleteMediaBody = {
  lessonId: number
  mediaItemId?: string
}

function getMediaType(mimeType: string) {
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  return 'file'
}

async function verifyCanManageLesson(lessonId: number) {
  const supabase = await createClient()
  const serviceSupabase = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: 'You must be logged in.',
      user: null,
      lesson: null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    return {
      ok: false,
      status: 403,
      error: 'Only teachers or admins can manage lesson media.',
      user,
      lesson: null,
    }
  }

  const { data: lesson } = await serviceSupabase
    .from('lessons')
    .select('id, course_id, slug')
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson) {
    return {
      ok: false,
      status: 404,
      error: 'Lesson not found.',
      user,
      lesson: null,
    }
  }

  const { data: course } = await serviceSupabase
    .from('courses')
    .select('teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle()

  if (!course) {
    return {
      ok: false,
      status: 404,
      error: 'Course not found.',
      user,
      lesson: null,
    }
  }

  const isAdmin = profile.role === 'admin'
  const ownsCourse = course.teacher_id === user.id

  if (!isAdmin && !ownsCourse) {
    return {
      ok: false,
      status: 403,
      error: 'You do not own this lesson.',
      user,
      lesson: null,
    }
  }

  return {
    ok: true,
    status: 200,
    error: '',
    user,
    lesson,
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as SaveMediaBody

  const lessonId = Number(body.lessonId)
  const mediaPath = String(body.mediaPath || '')
  const mediaMimeType = String(body.mediaMimeType || '')
  const originalName = String(body.originalName || '')
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const position = Number(body.position || 1)
  const isPublished = body.isPublished !== false

  if (!lessonId || !mediaPath || !mediaMimeType || !originalName) {
    return NextResponse.json(
      { error: 'Missing lesson media details.' },
      { status: 400 }
    )
  }

  if (!allowedMimeTypes.includes(mediaMimeType)) {
    return NextResponse.json(
      { error: 'Unsupported file type.' },
      { status: 400 }
    )
  }

  const verification = await verifyCanManageLesson(lessonId)

  if (!verification.ok || !verification.user || !verification.lesson) {
    return NextResponse.json(
      { error: verification.error },
      { status: verification.status }
    )
  }

  const expectedPrefix = `${verification.user.id}/lessons/${lessonId}/`

  if (!mediaPath.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: 'Invalid media path.' },
      { status: 403 }
    )
  }

  const serviceSupabase = createServiceRoleClient()
  const mediaType = getMediaType(mediaMimeType)

  const { error } = await serviceSupabase.from('lesson_media_items').insert({
    lesson_id: lessonId,
    title: title || originalName,
    description: description || null,
    media_path: mediaPath,
    media_type: mediaType,
    mime_type: mediaMimeType,
    original_name: originalName,
    position: position || 1,
    is_published: isPublished,
  })

  if (error) {
    await serviceSupabase.storage.from('lesson-media').remove([mediaPath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as UpdateMediaBody

  const lessonId = Number(body.lessonId)
  const mediaItemId = String(body.mediaItemId || '').trim()
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const position = Number(body.position || 1)
  const isPublished = body.isPublished !== false

  if (!lessonId || !mediaItemId) {
    return NextResponse.json(
      { error: 'Lesson ID and media item ID are required.' },
      { status: 400 }
    )
  }

  const verification = await verifyCanManageLesson(lessonId)

  if (!verification.ok || !verification.lesson) {
    return NextResponse.json(
      { error: verification.error },
      { status: verification.status }
    )
  }

  const serviceSupabase = createServiceRoleClient()

  const { data: item } = await serviceSupabase
    .from('lesson_media_items')
    .select('id, lesson_id')
    .eq('id', mediaItemId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (!item) {
    return NextResponse.json({ error: 'Media item not found.' }, { status: 404 })
  }

  const { error } = await serviceSupabase
    .from('lesson_media_items')
    .update({
      title: title || null,
      description: description || null,
      position: position || 1,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediaItemId)
    .eq('lesson_id', lessonId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as DeleteMediaBody
  const lessonId = Number(body.lessonId)
  const mediaItemId = String(body.mediaItemId || '').trim()

  if (!lessonId || !mediaItemId) {
    return NextResponse.json(
      { error: 'Lesson ID and media item ID are required.' },
      { status: 400 }
    )
  }

  const verification = await verifyCanManageLesson(lessonId)

  if (!verification.ok || !verification.lesson) {
    return NextResponse.json(
      { error: verification.error },
      { status: verification.status }
    )
  }

  const serviceSupabase = createServiceRoleClient()

  const { data: item } = await serviceSupabase
    .from('lesson_media_items')
    .select('id, lesson_id, media_path')
    .eq('id', mediaItemId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (!item) {
    return NextResponse.json({ error: 'Media item not found.' }, { status: 404 })
  }

  if (item.media_path) {
    await serviceSupabase.storage.from('lesson-media').remove([item.media_path])
  }

  const { error } = await serviceSupabase
    .from('lesson_media_items')
    .delete()
    .eq('id', mediaItemId)
    .eq('lesson_id', lessonId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
