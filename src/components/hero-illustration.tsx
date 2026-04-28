// src/components/hero-illustration.tsx
import { BookOpen, GraduationCap, Laptop, PlayCircle } from 'lucide-react'

export default function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-blue-200/50 blur-2xl" />
      <div className="absolute -right-6 bottom-10 h-28 w-28 rounded-full bg-sky-200/50 blur-2xl" />

      <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-6 shadow-[0_25px_70px_-30px_rgba(37,99,235,0.45)]">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-100">
                Flex Scholar
              </p>
              <h3 className="mt-2 text-2xl font-bold">Student Learning Hub</h3>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <GraduationCap className="h-7 w-7" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <Laptop className="h-6 w-6 text-blue-100" />
              <p className="mt-3 text-sm font-semibold">Online Lessons</p>
              <p className="mt-1 text-xs text-blue-100">
                Learn anywhere, anytime
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <BookOpen className="h-6 w-6 text-blue-100" />
              <p className="mt-3 text-sm font-semibold">Short Courses</p>
              <p className="mt-1 text-xs text-blue-100">
                Clear and practical content
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                <PlayCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Free Training</p>
                <p className="text-xs text-slate-600">Start with one short course</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Student Progress</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-2/3 rounded-full bg-blue-600" />
            </div>
            <p className="mt-2 text-xs text-slate-600">Track completed lessons</p>
          </div>
        </div>
      </div>
    </div>
  )
}