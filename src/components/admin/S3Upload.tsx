/**
 * S3 direct-upload widget.
 *
 * 1. GET signed PUT URL from /api/admin/upload
 * 2. PUT file directly to S3 from the browser
 * 3. Calls onUploaded(s3Key) with the resulting key
 *
 * Shows a progress bar and error message inline.
 */
'use client'

import { useRef, useState } from 'react'

interface S3UploadProps {
  /** S3 key prefix — e.g. "lessons/" or "products/" */
  keyPrefix:    string
  /** Accepted MIME types — e.g. "video/*" or ".pdf,.epub" */
  accept?:      string
  /** Current S3 key (if already uploaded) */
  currentKey?:  string | null
  /** Called with the final S3 key after a successful upload */
  onUploaded:   (_key: string) => void
  label?:       string
}

export function S3Upload({
  keyPrefix,
  accept = '*/*',
  currentKey,
  onUploaded,
  label = 'Upload file',
}: S3UploadProps) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [progress, setProgress]  = useState<number | null>(null)
  const [error,    setError]     = useState<string | null>(null)
  const [uploaded, setUploaded]  = useState<string | null>(currentKey ?? null)

  async function handleFile(file: File) {
    setError(null)
    setProgress(0)

    // Build a deterministic key: prefix + timestamp + filename
    const ext = file.name.split('.').pop() ?? 'bin'
    const key = `${keyPrefix}${Date.now()}.${ext}`

    // 1. Get signed upload URL
    const signedRes = await fetch('/api/admin/upload', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, contentType: file.type }),
    })
    if (!signedRes.ok) {
      setError('Failed to get upload URL')
      setProgress(null)
      return
    }
    const { uploadUrl } = await signedRes.json() as { uploadUrl: string }

    // 2. PUT directly to S3 using XMLHttpRequest for progress events
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`S3 PUT failed: ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error('Network error'))
      xhr.send(file)
    }).catch((err: Error) => {
      setError(err.message)
      setProgress(null)
      return
    })

    setProgress(100)
    setUploaded(key)
    onUploaded(key)

    // Reset progress bar after 2 s
    setTimeout(() => setProgress(null), 2000)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-secondary text-sm px-3 py-1.5 rounded-md"
        >
          {label}
        </button>
        {uploaded && (
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[240px]">
            {uploaded}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = '' // allow re-upload of same file
        }}
      />

      {progress !== null && (
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
