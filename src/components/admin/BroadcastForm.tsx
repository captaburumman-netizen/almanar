'use client'

import { useState, useTransition } from 'react'
import { AUDIENCE_OPTIONS }        from '@/lib/broadcast'
import type { AudienceType }       from '@/lib/broadcast'

type SendResult = { sent: number; failed: number } | null

export function BroadcastForm() {
  const [audience,    setAudience]    = useState<AudienceType>('ALL')
  const [subject,     setSubject]     = useState('')
  const [body,        setBody]        = useState('')
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [result,      setResult]      = useState<SendResult>(null)
  const [errMsg,      setErrMsg]      = useState('')
  const [step,        setStep]        = useState<'compose' | 'confirm'>('compose')
  const [isPending,   startTransition] = useTransition()

  async function handlePreview() {
    if (!subject.trim() || !body.trim()) {
      setErrMsg('Subject and body are required.')
      return
    }
    setErrMsg('')
    startTransition(async () => {
      const res  = await fetch('/api/admin/broadcast', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ audience, subject, body, preview: true }),
      })
      const json = await res.json()
      if (res.ok) {
        setPreviewCount(json.count)
        setStep('confirm')
      } else {
        setErrMsg(json.error ?? 'Preview failed')
      }
    })
  }

  async function handleSend() {
    setErrMsg('')
    startTransition(async () => {
      const res  = await fetch('/api/admin/broadcast', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ audience, subject, body, preview: false }),
      })
      const json = await res.json()
      if (res.ok) {
        setResult(json)
        setStep('compose')
      } else {
        setErrMsg(json.error ?? 'Send failed')
      }
    })
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  // ── Success state ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Broadcast sent!</p>
            <p className="text-xs text-green-600">
              {result.sent} sent · {result.failed} failed
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setResult(null); setSubject(''); setBody(''); setPreviewCount(null) }}
          className="text-sm text-green-700 hover:text-green-900 underline cursor-pointer"
        >
          Send another broadcast
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Audience */}
      <div>
        <label className={labelCls}>Audience</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AUDIENCE_OPTIONS.map(({ value, labelEn }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setAudience(value); setPreviewCount(null) }}
              className={[
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                audience === value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              {labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className={labelCls}>Subject *</label>
        <input
          type="text"
          className={inputCls}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. New course just launched!"
          maxLength={200}
        />
      </div>

      {/* Body */}
      <div>
        <label className={labelCls}>Message Body *</label>
        <textarea
          className={inputCls}
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message here. Separate paragraphs with a blank line."
          maxLength={5000}
        />
        <p className="mt-1 text-xs text-gray-400">{body.length}/5000 characters</p>
      </div>

      {errMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {/* Confirmation step */}
      {step === 'confirm' && previewCount !== null ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            Ready to send to{' '}
            <span className="text-amber-900">{previewCount.toLocaleString()} recipient{previewCount !== 1 ? 's' : ''}</span>?
          </p>
          <p className="text-xs text-amber-700">
            Subject: <strong>{subject}</strong>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending}
              className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {isPending ? 'Sending…' : `Send to ${previewCount.toLocaleString()} recipients`}
            </button>
            <button
              type="button"
              onClick={() => setStep('compose')}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPending || !subject.trim() || !body.trim()}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {isPending ? 'Loading…' : 'Preview & Continue →'}
        </button>
      )}
    </div>
  )
}
