// src/app/teacher/courses/new/page.tsx
import {
  BookOpen,
  CalendarDays,
  PlusCircle,
  Sparkles,
} from 'lucide-react'
import TeacherCourseForm from '@/components/teacher/teacher-course-form'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
          {icon}
        </div>

        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default async function TeacherNewCoursePage() {
  const { user } = await requireTeacherOrAdmin()

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Courses
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Create course
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Build a new course with lifecycle controls, seasonal dates, and
              recommended duration settings in the premium teacher workspace.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Premium course builder
                </p>
                <p className="text-sm text-slate-300">
                  Structure your next teaching program with clarity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          title="Course structure"
          description="Set the course title, description, and overall direction for students."
          icon={<BookOpen className="h-5 w-5" />}
        />

        <FeatureCard
          title="Seasonal timing"
          description="Control enrollment dates, course start dates, and course end dates."
          icon={<CalendarDays className="h-5 w-5" />}
        />

        <FeatureCard
          title="Launch ready"
          description="Prepare a draft now and publish when the course is ready for learners."
          icon={<PlusCircle className="h-5 w-5" />}
        />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <TeacherCourseForm mode="create" ownerId={user.id} />
      </section>
    </div>
  )
}