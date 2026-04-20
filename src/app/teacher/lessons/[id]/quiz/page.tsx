import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type QuizPageProps = {
  params: Promise<{ id: string }>
}

type Quiz = {
  id: number
  title: string
  quiz_type: string
  pass_percentage: number
  position: number
  is_published: boolean
}

type Question = {
  id: number
  quiz_id: number
  question: string
  position: number
}

type Option = {
  id: number
  question_id: number
  option_text: string
  is_correct: boolean
  position: number
}

export default async function TeacherLessonQuizPage({ params }: QuizPageProps) {
  const { id } = await params
  const lessonId = Number(id)

  if (!lessonId || Number.isNaN(lessonId)) {
    notFound()
  }

  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, course_id')
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson) {
    notFound()
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle()

  if (!course) {
    notFound()
  }

  const canManage = isAdmin || course.teacher_id === user.id

  if (!canManage) {
    notFound()
  }

  const { data: quizzesData } = await supabase
    .from('quizzes')
    .select('id, title, quiz_type, pass_percentage, position, is_published')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })

  const quizzes = (quizzesData ?? []) as Quiz[]
  const quizIds = quizzes.map((quiz) => quiz.id)

  let questions: Question[] = []
  let options: Option[] = []

  if (quizIds.length > 0) {
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, position')
      .in('quiz_id', quizIds)
      .order('position', { ascending: true })

    questions = (questionsData ?? []) as Question[]

    const questionIds = questions.map((question) => question.id)

    if (questionIds.length > 0) {
      const { data: optionsData } = await supabase
        .from('quiz_options')
        .select('id, question_id, option_text, is_correct, position')
        .in('question_id', questionIds)
        .order('position', { ascending: true })

      options = (optionsData ?? []) as Option[]
    }
  }

  async function createQuiz(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const title = String(formData.get('title') || '').trim()
    const quizType = String(formData.get('quiz_type') || 'final')
    const passPercentage = Number(formData.get('pass_percentage') || 90)
    const position = Number(formData.get('position') || 1)
    const isPublished = formData.get('is_published') === 'on'

    if (!title) {
      redirect(`/teacher/lessons/${lessonId}/quiz`)
    }

    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, course_id')
      .eq('id', lessonId)
      .maybeSingle()

    if (!lesson) {
      redirect('/teacher/lessons')
    }

    const { data: course } = await supabase
      .from('courses')
      .select('id, teacher_id')
      .eq('id', lesson.course_id)
      .maybeSingle()

    if (!course) {
      redirect('/teacher/lessons')
    }

    if (!isAdmin && course.teacher_id !== user.id) {
      redirect('/teacher/lessons')
    }

    await supabase.from('quizzes').insert({
      lesson_id: lessonId,
      title,
      quiz_type: quizType,
      pass_percentage: passPercentage,
      position,
      is_published: isPublished,
    })

    revalidatePath(`/teacher/lessons/${lessonId}/quiz`)
    redirect(`/teacher/lessons/${lessonId}/quiz`)
  }

  async function addQuestion(formData: FormData) {
    'use server'

    const { supabase } = await requireTeacherOrAdmin()

    const quizId = Number(formData.get('quiz_id'))
    const question = String(formData.get('question') || '').trim()
    const position = Number(formData.get('position') || 1)

    const option1 = String(formData.get('option_1') || '').trim()
    const option2 = String(formData.get('option_2') || '').trim()
    const option3 = String(formData.get('option_3') || '').trim()
    const option4 = String(formData.get('option_4') || '').trim()
    const correctOption = Number(formData.get('correct_option') || 1)

    if (!quizId || !question || !option1 || !option2) {
      redirect(`/teacher/lessons/${lessonId}/quiz`)
    }

    const { data: createdQuestion } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: quizId,
        question,
        position,
      })
      .select('id')
      .single()

    if (!createdQuestion) {
      redirect(`/teacher/lessons/${lessonId}/quiz`)
    }

    const optionValues = [option1, option2, option3, option4].filter(Boolean)

    await supabase.from('quiz_options').insert(
      optionValues.map((optionText, index) => ({
        question_id: createdQuestion.id,
        option_text: optionText,
        position: index + 1,
        is_correct: correctOption === index + 1,
      }))
    )

    revalidatePath(`/teacher/lessons/${lessonId}/quiz`)
    redirect(`/teacher/lessons/${lessonId}/quiz`)
  }

  async function deleteQuiz(formData: FormData) {
    'use server'

    const { supabase } = await requireTeacherOrAdmin()
    const quizId = Number(formData.get('quiz_id'))

    if (quizId) {
      await supabase.from('quizzes').delete().eq('id', quizId)
    }

    revalidatePath(`/teacher/lessons/${lessonId}/quiz`)
    redirect(`/teacher/lessons/${lessonId}/quiz`)
  }

  async function deleteQuestion(formData: FormData) {
    'use server'

    const { supabase } = await requireTeacherOrAdmin()
    const questionId = Number(formData.get('question_id'))

    if (questionId) {
      await supabase.from('quiz_questions').delete().eq('id', questionId)
    }

    revalidatePath(`/teacher/lessons/${lessonId}/quiz`)
    redirect(`/teacher/lessons/${lessonId}/quiz`)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/teacher/lessons"
          className="text-sm font-medium text-blue-600 underline"
        >
          ← Back to lessons
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Quiz Builder
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          {lesson.title}
        </h2>

        <p className="mt-2 text-slate-600">
          Create middle-lesson quizzes and final quizzes. Final quizzes should
          use a 90% passing score.
        </p>
      </div>

      <form
        action={createQuiz}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h3 className="text-2xl font-bold text-slate-900">Create quiz</h3>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Quiz title
            </label>
            <input
              name="title"
              required
              placeholder="Final lesson quiz"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Quiz type
            </label>
            <select
              name="quiz_type"
              defaultValue="final"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="middle">Middle lesson quiz</option>
              <option value="final">Final lesson quiz</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Pass percentage
            </label>
            <input
              name="pass_percentage"
              type="number"
              min="1"
              max="100"
              defaultValue="90"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
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
              defaultValue="1"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 md:col-span-2">
            <input name="is_published" type="checkbox" className="h-4 w-4" />
            <div>
              <p className="font-medium text-slate-900">Published</p>
              <p className="text-sm text-slate-500">
                Students can only take published quizzes.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Create quiz
        </button>
      </form>

      {quizzes.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-700">No quizzes created for this lesson yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {quizzes.map((quiz) => {
            const quizQuestions = questions.filter(
              (question) => question.quiz_id === quiz.id
            )

            return (
              <section
                key={quiz.id}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {quiz.title}
                      </h3>

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {quiz.quiz_type}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          quiz.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {quiz.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <p className="mt-2 text-slate-600">
                      Pass score: {quiz.pass_percentage}% · Position:{' '}
                      {quiz.position}
                    </p>
                  </div>

                  <form action={deleteQuiz}>
                    <input type="hidden" name="quiz_id" value={quiz.id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Delete quiz
                    </button>
                  </form>
                </div>

                <form
                  action={addQuestion}
                  className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <input type="hidden" name="quiz_id" value={quiz.id} />

                  <h4 className="text-lg font-bold text-slate-900">
                    Add question
                  </h4>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Question
                      </label>
                      <textarea
                        name="question"
                        required
                        rows={3}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        placeholder="Write the question..."
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {[1, 2, 3, 4].map((number) => (
                        <div key={number}>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Option {number}
                          </label>
                          <input
                            name={`option_${number}`}
                            required={number <= 2}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                            placeholder={`Answer option ${number}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Correct answer
                      </label>
                      <select
                        name="correct_option"
                        defaultValue="1"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      >
                        <option value="1">Option 1</option>
                        <option value="2">Option 2</option>
                        <option value="3">Option 3</option>
                        <option value="4">Option 4</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Question position
                      </label>
                      <input
                        name="position"
                        type="number"
                        min="1"
                        defaultValue={quizQuestions.length + 1}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Add question
                  </button>
                </form>

                <div className="mt-8">
                  <h4 className="text-lg font-bold text-slate-900">
                    Questions
                  </h4>

                  {quizQuestions.length === 0 ? (
                    <p className="mt-4 text-slate-600">
                      No questions added yet.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {quizQuestions.map((question) => {
                        const questionOptions = options.filter(
                          (option) => option.question_id === question.id
                        )

                        return (
                          <div
                            key={question.id}
                            className="rounded-2xl border border-slate-200 p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <p className="text-sm text-slate-500">
                                  Question {question.position}
                                </p>
                                <h5 className="mt-1 font-semibold text-slate-900">
                                  {question.question}
                                </h5>
                              </div>

                              <form action={deleteQuestion}>
                                <input
                                  type="hidden"
                                  name="question_id"
                                  value={question.id}
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </form>
                            </div>

                            <div className="mt-4 grid gap-2">
                              {questionOptions.map((option) => (
                                <div
                                  key={option.id}
                                  className={`rounded-xl border px-4 py-3 text-sm ${
                                    option.is_correct
                                      ? 'border-green-200 bg-green-50 text-green-800'
                                      : 'border-slate-200 bg-white text-slate-700'
                                  }`}
                                >
                                  {option.option_text}
                                  {option.is_correct && (
                                    <span className="ml-2 font-semibold">
                                      ✓ correct
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}