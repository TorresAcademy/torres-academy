// src/app/services/page.tsx
import Link from 'next/link'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />

      <main className="bg-white">
        <section className="border-b">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Services
            </p>
            <h1 className="mt-4 text-4xl font-bold">How Torres Academy can help</h1>
            <p className="mt-6 max-w-2xl text-lg text-gray-600">
              In addition to free training, Torres Academy can offer guided learning,
              structured lessons, and personalized support.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto grid max-w-5xl gap-6 px-6 py-16 md:grid-cols-3">
            <div className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold">Private Support</h2>
              <p className="mt-3 text-gray-600">
                One-to-one guidance for students who want more focused help.
              </p>
            </div>

            <div className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold">Short Courses</h2>
              <p className="mt-3 text-gray-600">
                Practical online courses designed around clear learning goals.
              </p>
            </div>

            <div className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold">Learning Resources</h2>
              <p className="mt-3 text-gray-600">
                Structured materials and guided lessons to support steady progress.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y bg-gray-50">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-3xl font-bold">Work with Torres Academy</h2>
            <p className="mt-4 max-w-2xl text-gray-600">
              This page can later include your real offers, pricing, and contact details.
              For now, it serves as a professional public page for your teaching brand.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/free-training"
                className="rounded-lg border px-5 py-3 font-medium"
              >
                Start with Free Training
              </Link>
              <Link
                href="/login"
                className="rounded-lg border px-5 py-3 font-medium"
              >
                Student Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}