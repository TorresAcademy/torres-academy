'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Video,
} from 'lucide-react'

export type PresentationSlide = {
  id: string
  title: string | null
  description: string | null
  mediaType: string | null
  mimeType: string | null
  originalName: string | null
  position: number
  signedUrl: string | null
}

function getSlideLabel(slide: PresentationSlide) {
  return slide.title || slide.originalName || `Slide ${slide.position}`
}

function getSlideIcon(slide: PresentationSlide) {
  if (slide.mediaType === 'video') return <Video className="h-5 w-5" />
  if (slide.mediaType === 'pdf' || slide.mediaType === 'file') {
    return <FileText className="h-5 w-5" />
  }

  return <ImageIcon className="h-5 w-5" />
}

export default function LessonPresentationSlides({
  slides,
}: {
  slides: PresentationSlide[]
}) {
  const safeSlides = useMemo(
    () => slides.filter((slide) => Boolean(slide.signedUrl)),
    [slides]
  )

  const [activeIndex, setActiveIndex] = useState(0)
  const activeSlide = safeSlides[activeIndex] ?? null

  const hasSlides = safeSlides.length > 0
  const hasPrevious = activeIndex > 0
  const hasNext = activeIndex < safeSlides.length - 1

  function goPrevious() {
    setActiveIndex((current) => Math.max(0, current - 1))
  }

  function goNext() {
    setActiveIndex((current) => Math.min(safeSlides.length - 1, current + 1))
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setActiveIndex((current) => Math.max(0, current - 1))
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setActiveIndex((current) => Math.min(safeSlides.length - 1, current + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [safeSlides.length])

  if (!hasSlides || !activeSlide) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl bg-slate-900 text-center text-slate-300">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
            Presentation Media Area
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            No presentation slides uploaded for this lesson yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-900/80 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
            {getSlideIcon(activeSlide)}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              Slide {activeIndex + 1} of {safeSlides.length}
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {getSlideLabel(activeSlide)}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevious}
            disabled={!hasPrevious}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={!hasNext}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-4">
        {hasPrevious && (
          <button
            type="button"
            onClick={goPrevious}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white shadow-2xl backdrop-blur transition hover:bg-blue-600"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white shadow-2xl backdrop-blur transition hover:bg-blue-600"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {activeSlide.mediaType === 'video' ? (
          <video
            key={activeSlide.id}
            src={activeSlide.signedUrl ?? ''}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            className="max-h-[72vh] w-full rounded-2xl bg-black object-contain"
            onContextMenu={(event) => event.preventDefault()}
          />
        ) : activeSlide.mediaType === 'pdf' ? (
          <iframe
            key={activeSlide.id}
            src={activeSlide.signedUrl ?? ''}
            title={getSlideLabel(activeSlide)}
            className="h-[72vh] w-full rounded-2xl border border-white/10 bg-white"
          />
        ) : activeSlide.mediaType === 'file' ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-slate-900 text-center">
            <div>
              <FileText className="mx-auto h-12 w-12 text-amber-300" />
              <p className="mt-4 text-lg font-semibold text-white">
                {getSlideLabel(activeSlide)}
              </p>
              <a
                href={activeSlide.signedUrl ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Open resource
              </a>
            </div>
          </div>
        ) : (
          <img
            key={activeSlide.id}
            src={activeSlide.signedUrl ?? ''}
            alt={getSlideLabel(activeSlide)}
            draggable={false}
            className="max-h-[72vh] w-full rounded-2xl object-contain"
            onContextMenu={(event) => event.preventDefault()}
          />
        )}
      </div>

      {activeSlide.description && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
            Slide note
          </p>
          <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-200">
            {activeSlide.description}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {safeSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-3 rounded-full transition ${
              index === activeIndex
                ? 'w-10 bg-blue-500'
                : 'w-3 bg-white/30 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}: ${getSlideLabel(slide)}`}
          />
        ))}
      </div>

      <p className="text-center text-xs text-slate-400">
        Tip: use the keyboard left and right arrow keys to move between slides.
      </p>
    </section>
  )
}
