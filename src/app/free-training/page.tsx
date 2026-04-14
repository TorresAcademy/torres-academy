// src/app/free-training/page.tsx
import Link from 'next/link'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'

export default function FreeTrainingPage() {
  return (
    <>
      <SiteHeader />

      <main className="bg-white">
        <section className="border-b bg-gray-50">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Free Training
            </p>
            <h1 className="mt-4 text-4xl font-bold">Start learning with a free short course</h1>
            <p className="mt-6 max-w-2xl text-lg text-gray-600">
              The free training is designed to help new students get started quickly,
              understand the teaching style, and build confidence from the first lesson.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="rounded-lg border px-5 py-3 font-medium"
              >
                Join Free Training
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border px-5 py-3 font-medium"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-5xl px-6 py-16">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border p-6">
                <h2 className="text-xl font-semibold">Step 1</h2>
                <p className="mt-3 text-gray-600">
                  Create your account using a simple email login.
                </p>
              </div>

              <div className="rounded-2xl border p-6">
                <h2 className="text-xl font-semibold">Step 2</h2>
                <p className="mt-3 text-gray-600">
                  Access your student dashboard and open the available course.
                </p>
              </div>

              <div className="rounded-2xl border p-6">
                <h2 className="text-xl font-semibold">Step 3</h2>
                <p className="mt-3 text-gray-600">
                  Complete lessons and track your progress as you learn.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-3xl font-bold">What is included</h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border p-6">
                <h3 className="text-xl font-semibold">Short lessons</h3>
                <p className="mt-3 text-gray-600">
                  Focused lessons designed to help students learn without feeling overwhelmed.
                </p>
              </div>

              <div className="rounded-2xl border p-6">
                <h3 className="text-xl font-semibold">Simple progress tracking</h3>
                <p className="mt-3 text-gray-600">
                  Students can complete lessons and clearly see what they have finished.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}