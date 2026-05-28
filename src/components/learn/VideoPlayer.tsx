/**
 * VideoPlayer — HTML5 video with brand styling.
 *
 * Receives a server-generated signed S3 URL (short TTL).
 * Fires onEnded callback so the parent can prompt the user to mark complete.
 * Client component — cannot be rendered on the server.
 */
'use client'

import { useRef, useState } from 'react'

interface VideoPlayerProps {
  /** Signed S3 URL (null = no video uploaded yet) */
  src:      string | null
  title:    string
  lessonId: string
  locale:   string
}

export function VideoPlayer({ src, title, locale }: VideoPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const [ended, setEnded] = useState(false)
  const isAr = locale === 'ar'

  if (!src) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-sand-dark/20 flex items-center justify-center">
        <div className="text-center space-y-3 px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-7 w-7 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'الفيديو قيد الإعداد' : 'Video coming soon'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        src={src}
        title={title}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full"
        onEnded={() => setEnded(true)}
        onPlay={() => setEnded(false)}
      >
        {isAr ? 'متصفحك لا يدعم تشغيل الفيديو.' : 'Your browser does not support the video element.'}
      </video>

      {/* Soft nudge when video ends */}
      {ended && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="rounded-xl bg-background/90 px-6 py-4 text-center shadow-lg pointer-events-auto">
            <p className="text-sm font-medium text-foreground">
              {isAr ? '✓ انتهى الفيديو' : '✓ Video complete'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr ? 'سجّل إتمامك للدرس أدناه' : 'Mark the lesson complete below'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
