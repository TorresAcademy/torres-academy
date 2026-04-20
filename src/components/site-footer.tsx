import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Torres <span className="text-blue-600">Academy</span>
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Practical online lessons, free training, and guided learning support
            for students who want steady progress.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">Explore</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <Link href="/free-training" className="block hover:text-blue-600">
              Free Training
            </Link>
            <Link href="/services" className="block hover:text-blue-600">
              Services
            </Link>
            <Link href="/about" className="block hover:text-blue-600">
              About
            </Link>
            <Link href="/contact" className="block hover:text-blue-600">
              Contact
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">Student Portal</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Students can register, enroll in free courses, track lessons, and
            continue learning from their dashboard.
          </p>

          <Link
            href="/login"
            className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Student Login
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Torres Academy. All rights reserved.
      </div>
    </footer>
  )
}