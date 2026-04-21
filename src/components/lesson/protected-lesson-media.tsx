'use client'

type LessonMedia = {
  url: string | null
  type: string | null
  mimeType: string | null
  originalName: string | null
}

type ProtectedLessonMediaProps = {
  media: LessonMedia
}

export default function ProtectedLessonMedia({
  media,
}: ProtectedLessonMediaProps) {
  if (!media.url || !media.type) {
    return (
      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
        <div className="aspect-video w-full">
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-center text-white">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                Media-ready lesson stage
              </p>
              <h3 className="mt-3 text-2xl font-bold">
                Protected lesson video / image area
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                No media has been uploaded for this lesson yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (media.type === 'video') {
    return (
      <div
        className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-sm"
        onContextMenu={(e) => e.preventDefault()}
      >
        <video
          className="aspect-video w-full bg-black"
          controls
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          preload="metadata"
        >
          <source src={media.url} type={media.mimeType || 'video/mp4'} />
          Your browser does not support the video tag.
        </video>

        <div className="border-t border-white/10 bg-slate-950 px-5 py-3 text-xs text-slate-300">
          Protected lesson media · Temporary access link · Downloads disabled in
          player controls
        </div>
      </div>
    )
  }

  return (
    <div
      className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex justify-center bg-slate-950 p-4">
        <img
          src={media.url}
          alt={media.originalName || 'Lesson image'}
          draggable={false}
          className="max-h-[620px] max-w-full rounded-2xl object-contain"
        />
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
        Protected lesson image · Temporary access link · Right-click disabled as
        a deterrent
      </div>
    </div>
  )
}