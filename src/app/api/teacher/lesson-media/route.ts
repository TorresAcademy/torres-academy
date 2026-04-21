import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

type SaveMediaBody = {
  lessonId: number
  mediaPath: string
  mediaMimeType: string
  originalName: string
}

type DeleteMediaBody = {
  lessonId: number
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
    .select('id, course_id, media_path')
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

  const mediaType = mediaMimeType.startsWith('video/') ? 'video' : 'image'
  const serviceSupabase = createServiceRoleClient()

  if (
    verification.lesson.media_path &&
    verification.lesson.media_path !== mediaPath
  ) {
    await serviceSupabase.storage
      .from('lesson-media')
      .remove([verification.lesson.media_path])
  }

  const { error } = await serviceSupabase
    .from('lessons')
    .update({
      media_path: mediaPath,
      media_type: mediaType,
      media_original_name: originalName,
      media_mime_type: mediaMimeType,
      media_uploaded_at: new Date().toISOString(),
    })
    .eq('id', lessonId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as DeleteMediaBody
  const lessonId = Number(body.lessonId)

  if (!lessonId) {
    return NextResponse.json(
      { error: 'Lesson ID is required.' },
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

  if (verification.lesson.media_path) {
    await serviceSupabase.storage
      .from('lesson-media')
      .remove([verification.lesson.media_path])
  }

  const { error } = await serviceSupabase
    .from('lessons')
    .update({
      media_path: null,
      media_type: null,
      media_original_name: null,
      media_mime_type: null,
      media_uploaded_at: null,
    })
    .eq('id', lessonId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}