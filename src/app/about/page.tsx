// src/app/about/page.tsx
import Link from 'next/link'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main className="bg-white">
        <section className="border-b">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              About Torres Academy
            </p>
            <h1 className="mt-4 text-4xl font-bold">A simple and practical way to learn</h1>
            <p className="mt-6 text-lg text-gray-600">
              Torres Academy is built to help students learn through clear lessons,
              practical guidance, and a supportive online experience.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
            <div>
              <h2 className="text-2xl font-semibold">The mission</h2>
              <p className="mt-3 text-gray-700">
                The goal is to make learning feel simple, structured, and useful.
                Students should know what to do next, what they are improving, and
                how to keep moving forward.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">The teaching style</h2>
              <p className="mt-3 text-gray-700">
                Lessons are designed to be clear, focused, and practical. Instead of
                making learning feel overwhelming, Torres Academy helps students take
                one step at a time.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">What students can expect</h2>
              <ul className="mt-4 space-y-3 text-gray-700">
                <li>Simple explanations</li>
                <li>Short courses and focused lessons</li>
                <li>Learning resources inside a student portal</li>
                <li>Steady progress through guided practice</li>
              </ul>
            </div>

            <div className="rounded-2xl border p-6">
              <h2 className="text-2xl font-semibold">Start your journey</h2>
              <p className="mt-3 text-gray-700">
                Begin with the free training to explore the platform and see how
                Torres Academy can support your learning.
              </p>

              <div className="mt-5">
                <Link
                  href="/free-training"
                  className="inline-block rounded-lg border px-5 py-3 font-medium"
                >
                  Go to Free Training
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}