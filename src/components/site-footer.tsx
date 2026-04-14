import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Torres <span className="text-blue-600">Academy</span>
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Free training, short courses, and guided learning online.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/about" className="text-slate-700 hover:text-blue-600">
              About
            </Link>
            <Link href="/free-training" className="text-slate-700 hover:text-blue-600">
              Free Training
            </Link>
            <Link href="/services" className="text-slate-700 hover:text-blue-600">
              Services
            </Link>
            <Link href="/login" className="text-slate-700 hover:text-blue-600">
              Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}