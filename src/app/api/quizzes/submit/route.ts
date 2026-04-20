import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SubmitQuizBody = {
  quizId: number
  answers: Record<string, number>
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

  const body = (await request.json()) as SubmitQuizBody
  const quizId = Number(body.quizId)
  const answers = body.answers || {}

  if (!quizId) {
    return NextResponse.json(
      { error: 'Quiz ID is required.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    input_quiz_id: quizId,
    input_answers: answers,
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json(data)
}