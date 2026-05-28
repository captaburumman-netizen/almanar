/**
 * GET /api/og — Dynamic Open Graph image generator
 *
 * Query params:
 *   type     — 'course' | 'product' | 'certificate' | 'default'
 *   title    — primary heading (URL-encoded)
 *   subtitle — secondary line (URL-encoded, optional)
 *   badge    — short label shown top-right (e.g. 'Course', 'Product')
 *   locale   — 'ar' | 'en'  (affects text direction hint in subtitle)
 *
 * Returns a 1200×630 PNG suitable for og:image.
 * Runtime: edge — rendered by Satori via next/og.
 */
import { ImageResponse } from 'next/og'
import { NextRequest }   from 'next/server'

export const runtime = 'edge'

const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://almanar.co'
const TERRACOTA = '#C4622D'
const CREAM     = '#FDF6EE'
const DARK      = '#1A1109'
const MUTED     = '#7A6352'
const BADGE_BG  = '#F5E6D4'

const BADGE_LABELS: Record<string, string> = {
  course:      'Course',
  product:     'Product',
  certificate: 'Certificate',
  default:     'ALMANAR',
}

export async function GET(req: NextRequest) {
  const sp       = new URL(req.url).searchParams
  const type     = sp.get('type')     ?? 'default'
  const title    = sp.get('title')    ?? 'ALMANAR'
  const subtitle = sp.get('subtitle') ?? ''
  const badge    = sp.get('badge')    ?? BADGE_LABELS[type] ?? 'ALMANAR'

  // Truncate long titles so they fit in two lines
  const displayTitle    = title.length    > 72 ? title.slice(0, 70) + '…'    : title
  const displaySubtitle = subtitle.length > 90 ? subtitle.slice(0, 88) + '…' : subtitle

  return new ImageResponse(
    (
      <div
        style={{
          width:           '100%',
          height:          '100%',
          display:         'flex',
          flexDirection:   'column',
          backgroundColor: CREAM,
          position:        'relative',
          fontFamily:      'sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div style={{ width: '100%', height: '10px', backgroundColor: TERRACOTA, flexShrink: 0 }} />

        {/* Main content */}
        <div
          style={{
            flex:           1,
            display:        'flex',
            flexDirection:  'column',
            padding:        '52px 64px 48px',
            justifyContent: 'space-between',
          }}
        >
          {/* Top row: brand + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Brand mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width:           '36px',
                  height:          '36px',
                  borderRadius:    '8px',
                  backgroundColor: TERRACOTA,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  color:           '#fff',
                  fontWeight:      700,
                  fontSize:        '18px',
                }}
              >
                A
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: DARK, letterSpacing: '-0.5px' }}>
                ALMANAR
              </span>
            </div>

            {/* Type badge */}
            <div
              style={{
                backgroundColor: BADGE_BG,
                color:           TERRACOTA,
                fontSize:        '14px',
                fontWeight:      600,
                padding:         '6px 16px',
                borderRadius:    '999px',
                border:          `1.5px solid ${TERRACOTA}33`,
              }}
            >
              {badge}
            </div>
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                fontSize:    displayTitle.length > 40 ? '44px' : '52px',
                fontWeight:  700,
                color:       DARK,
                lineHeight:  1.2,
                letterSpacing: '-1px',
              }}
            >
              {displayTitle}
            </div>

            {displaySubtitle && (
              <div
                style={{
                  fontSize:   '22px',
                  color:      MUTED,
                  lineHeight: 1.4,
                  fontWeight: 400,
                }}
              >
                {displaySubtitle}
              </div>
            )}
          </div>

          {/* Bottom: decorative divider + URL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '32px', height: '3px', backgroundColor: TERRACOTA, borderRadius: '2px' }} />
            <span style={{ fontSize: '16px', color: MUTED, fontWeight: 500 }}>
              {APP_URL.replace(/^https?:\/\//, '')}
            </span>
          </div>
        </div>

        {/* Right-side decorative accent column */}
        <div
          style={{
            position:        'absolute',
            right:           0,
            top:             '10px',
            width:           '6px',
            height:          'calc(100% - 10px)',
            backgroundColor: `${TERRACOTA}22`,
          }}
        />
      </div>
    ),
    {
      width:  1200,
      height: 630,
    },
  )
}
