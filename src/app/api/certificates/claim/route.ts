import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ClaimCertificateBody = {
  courseId: number
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'You must be logged in.' },
      { status: 401 }
    )
  }

  const body = (await request.json()) as ClaimCertificateBody
  const courseId = Number(body.courseId)

  if (!courseId || Number.isNaN(courseId)) {
    return NextResponse.json(
      { error: 'Course ID is required.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.rpc('claim_course_certificate', {
    input_course_id: courseId,
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json(data)
}