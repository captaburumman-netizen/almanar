/**
 * Public certificate page — /[locale]/certificates/[code]
 *
 * Shareable, printable. No authentication required.
 * Bilingual: shows both Arabic and English names on the certificate.
 */
import { notFound }                  from 'next/navigation'
import { getCertificateByCode }      from '@/lib/certificates'
import { buildCertificateMetadata }  from '@/lib/seo'
import type { Locale }               from '@/i18n/routing'

interface Props {
  params: Promise<{ locale: Locale; code: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale, code } = await params
  const cert = await getCertificateByCode(code).catch(() => null)
  if (!cert) return { title: 'Certificate — ALMANAR' }

  return buildCertificateMetadata({
    userName:   cert.user.name,
    courseName: cert.course.titleEn,
    code,
    locale,
  })
}

function formatDate(d: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  }).format(new Date(d))
}

export default async function CertificatePage({ params }: Props) {
  const { locale, code } = await params
  const isAr             = locale === 'ar'

  const cert = await getCertificateByCode(code).catch(() => null)
  if (!cert) notFound()

  const recipientName = cert.user.name || (isAr ? 'الطالب' : 'Student')
  const dateStr       = formatDate(cert.issuedAt, locale)

  return (
    <>
      {/* Print button — hidden on print */}
      <div className="print:hidden fixed bottom-6 right-6 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          {isAr ? 'طباعة / PDF' : 'Print / Save PDF'}
        </button>
        <a
          href={isAr ? '/ar/dashboard' : '/en/dashboard'}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-lg hover:bg-gray-50 transition-colors"
        >
          ← {isAr ? 'العودة' : 'Back'}
        </a>
      </div>

      {/* Certificate — full-page on print */}
      <div className="min-h-screen bg-gray-100 print:bg-white flex items-center justify-center p-6 print:p-0">
        <div
          className={[
            'relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl print:shadow-none print:rounded-none',
            'overflow-hidden',
          ].join(' ')}
          style={{ aspectRatio: '1.414 / 1' /* A4 landscape ratio */ }}
        >
          {/* ── Decorative border ──────────────────────────────────────────── */}
          <div
            className="absolute inset-3 rounded-xl pointer-events-none"
            style={{
              border: '3px solid #C4622D',
              boxShadow: 'inset 0 0 0 6px #F5EDE3',
            }}
            aria-hidden
          />
          {/* Corner ornaments */}
          <Ornament className="absolute top-5 left-5"     />
          <Ornament className="absolute top-5 right-5 rotate-90"  />
          <Ornament className="absolute bottom-5 left-5 -rotate-90" />
          <Ornament className="absolute bottom-5 right-5 rotate-180" />

          {/* ── Certificate body ───────────────────────────────────────────── */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-12 py-8 gap-3">

            {/* ALMANAR logo / brand */}
            <p className="text-xs font-bold tracking-[0.25em] text-[#C4622D] uppercase opacity-80">
              ALMANAR · المنار
            </p>

            {/* Title — bilingual */}
            <div className="space-y-0.5">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                Certificate of Completion
              </h1>
              <p className="text-xl font-bold text-gray-900" dir="rtl">
                شهادة إتمام الدورة
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 w-48 my-1" aria-hidden>
              <div className="flex-1 h-px bg-[#C4622D]/40" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#C4622D]" />
              <div className="flex-1 h-px bg-[#C4622D]/40" />
            </div>

            {/* Presented to */}
            <p className="text-xs text-gray-400 uppercase tracking-widest">
              {isAr ? 'مُقدَّمة إلى' : 'This certifies that'}
            </p>

            {/* Recipient name */}
            <p
              className="text-3xl font-bold text-[#C4622D]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {recipientName}
            </p>

            {/* Has completed */}
            <p className="text-sm text-gray-500">
              {isAr ? 'قد أتمّ بنجاح دورة' : 'has successfully completed the course'}
            </p>

            {/* Course title — bilingual */}
            <div className="max-w-sm">
              <p className="text-lg font-semibold text-gray-900 leading-snug">
                {cert.course.titleEn}
              </p>
              <p className="text-lg font-semibold text-gray-900 leading-snug" dir="rtl">
                {cert.course.titleAr}
              </p>
            </div>

            {/* Date */}
            <p className="text-xs text-gray-400 mt-1">{dateStr}</p>

            {/* Certificate code */}
            <p className="text-[10px] text-gray-300 tracking-wider mt-2 font-mono">
              {isAr ? 'رمز الشهادة:' : 'Certificate ID:'} {cert.code}
            </p>

            {/* Verify URL */}
            <p className="text-[10px] text-gray-300">
              almanar.co/{locale}/certificates/{cert.code}
            </p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { margin: 0; }
          @page { size: A4 landscape; margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:p-0 { padding: 0 !important; }
          div[style*='aspect-ratio'] {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
            aspect-ratio: unset !important;
          }
        }
      `}</style>
    </>
  )
}

// ── Corner ornament SVG ────────────────────────────────────────────────────────
function Ornament({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M2 2 L2 14 M2 2 L14 2"
        stroke="#C4622D"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="2" cy="2" r="2.5" fill="#C4622D" />
    </svg>
  )
}
