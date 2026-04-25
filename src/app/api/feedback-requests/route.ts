import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

async function createTeacherFeedbackNotification(params: {
  teacherId: string | null | undefined
  studentName: string
  courseTitle: string
  lessonTitle: string
  isResubmission: boolean
}) {
  if (!params.teacherId) return

  const serviceSupabase = createServiceRoleClient()

  await serviceSupabase.from('notifications').insert({
    user_id: params.teacherId,
    type: params.isResubmission
      ? 'feedback_request_resubmitted'
      : 'feedback_request_received',
    title: params.isResubmission
      ? `Feedback request updated: ${params.lessonTitle}`
      : `Feedback request received: ${params.lessonTitle}`,
    message: params.isResubmission
      ? `${params.studentName} updated a feedback request for ${params.lessonTitle}.`
      : `${params.studentName} requested feedback for ${params.lessonTitle}.`,
    link_url: '/teacher/feedback',
  })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceRoleClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const lessonId = Number(body.lessonId)
    const studentMessage = String(body.studentMessage ?? '').trim()

    if (!lessonId || !studentMessage) {
      return NextResponse.json(
        { error: 'lessonId and studentMessage are required' },
        { status: 400 }
      )
    }

    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    const studentName =
      studentProfile?.full_name || studentProfile?.email || 'A student'

    const { data: lesson, error: lessonError } = await serviceSupabase
      .from('lessons')
      .select('id, title, course_id')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const { data: course, error: courseError } = await serviceSupabase
      .from('courses')
      .select('id, title, teacher_id')
      .eq('id', lesson.course_id)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const { data: existingRequest } = await supabase
      .from('feedback_requests')
      .select(
        'id, status, student_message, teacher_feedback, created_at, reviewed_at'
      )
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    const { data: savedRequest, error: upsertError } = await supabase
      .from('feedback_requests')
      .upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          student_message: studentMessage,
          status: 'pending',
          teacher_feedback: null,
          reviewed_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,lesson_id',
        }
      )
      .select(
        'id, status, student_message, teacher_feedback, created_at, reviewed_at'
      )
      .single()

    if (upsertError || !savedRequest) {
      return NextResponse.json(
        { error: upsertError?.message || 'Could not save feedback request' },
        { status: 500 }
      )
    }

    const shouldNotifyTeacher =
      !existingRequest ||
      existingRequest.status === 'reviewed' ||
      existingRequest.status === 'closed'

    if (shouldNotifyTeacher) {
      try {
        await createTeacherFeedbackNotification({
          teacherId: course.teacher_id,
          studentName,
          courseTitle: course.title,
          lessonTitle: lesson.title,
          isResubmission: Boolean(existingRequest),
        })
      } catch (notificationError) {
        console.error('Teacher feedback notification error:', notificationError)
      }
    }

    return NextResponse.json({
      request: savedRequest,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}