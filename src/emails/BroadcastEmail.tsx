/**
 * Broadcast email template — used for admin-initiated bulk emails.
 *
 * Renders the admin's subject and body content with ALMANAR branding.
 * Body paragraphs are split on newlines for readability.
 */
import * as React from 'react'

export interface BroadcastEmailProps {
  name:   string   // recipient's first name (or fallback)
  body:   string   // admin-written message body
  appUrl: string
}

const C = {
  primary: '#C4622D',
  dark:    '#3D2B1F',
  medium:  '#5C4033',
  cream:   '#FAF7F2',
  muted:   '#9A8778',
  border:  '#E8DDD5',
  white:   '#FFFFFF',
}

const wrap: React.CSSProperties = {
  fontFamily:      'Arial, sans-serif',
  maxWidth:        560,
  margin:          '0 auto',
  backgroundColor: C.white,
  borderRadius:    12,
  overflow:        'hidden',
}

export function BroadcastEmail({ name, body, appUrl }: BroadcastEmailProps) {
  const year       = new Date().getFullYear()
  const paragraphs = body.split(/\n+/).filter(Boolean)

  return (
    <div style={wrap}>
      {/* Header */}
      <div style={{ backgroundColor: C.primary, padding: '28px 40px' }}>
        <h1 style={{ color: C.cream, fontSize: 22, margin: 0, fontWeight: 700, letterSpacing: '0.06em' }}>
          ALMANAR · المنار
        </h1>
        <p style={{ color: C.cream, opacity: 0.75, fontSize: 12, margin: '4px 0 0' }}>
          منصة التعليم الوالدي · Parenting Education
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '36px 40px', backgroundColor: C.cream }}>
        {/* Personalised greeting */}
        <p style={{ color: C.dark, fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>
          {name ? `${name},` : ''}
        </p>

        {/* Admin-composed content */}
        {paragraphs.map((para, i) => (
          <p key={i} style={{
            color:      C.medium,
            fontSize:   15,
            lineHeight: 1.8,
            margin:     i === paragraphs.length - 1 ? 0 : '0 0 14px',
          }}>
            {para}
          </p>
        ))}

        {/* Platform link */}
        <div style={{ marginTop: 28 }}>
          <a
            href={appUrl}
            style={{
              display:         'inline-block',
              padding:         '12px 28px',
              backgroundColor: C.primary,
              color:           C.cream,
              borderRadius:    8,
              textDecoration:  'none',
              fontWeight:      700,
              fontSize:        14,
            }}
          >
            Visit ALMANAR
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: C.dark, padding: '20px 40px', textAlign: 'center' }}>
        <p style={{ color: C.muted, fontSize: 11, margin: 0, lineHeight: 1.6 }}>
          © {year} ALMANAR. All rights reserved.
          <br />
          You received this email because you have an account on ALMANAR.
        </p>
      </div>
    </div>
  )
}
