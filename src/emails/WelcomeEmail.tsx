/**
 * Welcome email — sent on successful registration.
 *
 * Fully branded ALMANAR template with warm-brown palette.
 * Bilingual: renders Arabic (RTL) or English based on locale prop.
 */
import * as React from 'react'

interface WelcomeEmailProps {
  name:   string
  locale: string
  appUrl: string
}

// ─── Shared tokens ────────────────────────────────────────────────────────────

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
  fontFamily:      'Georgia, "Times New Roman", serif',
  maxWidth:        560,
  margin:          '0 auto',
  backgroundColor: C.white,
  borderRadius:    12,
  overflow:        'hidden',
}

const header = (align: 'left' | 'right'): React.CSSProperties => ({
  backgroundColor: C.primary,
  padding:         '28px 40px',
  textAlign:       align,
})

const body: React.CSSProperties = {
  padding:         '36px 40px',
  backgroundColor: C.cream,
}

const footer: React.CSSProperties = {
  backgroundColor: C.dark,
  padding:         '20px 40px',
  textAlign:       'center',
}

const btn: React.CSSProperties = {
  display:         'inline-block',
  marginTop:       24,
  padding:         '13px 32px',
  backgroundColor: C.primary,
  color:           C.cream,
  borderRadius:    8,
  textDecoration:  'none',
  fontWeight:      700,
  fontSize:        15,
  letterSpacing:   '0.02em',
}

const divider: React.CSSProperties = {
  marginTop:    32,
  paddingTop:   24,
  borderTop:    `1px solid ${C.border}`,
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WelcomeEmail({ name, locale, appUrl }: WelcomeEmailProps) {
  const isAr = locale === 'ar'
  const year = new Date().getFullYear()
  const coursesUrl = `${appUrl}/${locale}/courses`

  if (isAr) {
    return (
      <div dir="rtl" lang="ar" style={wrap}>
        <div style={header('right')}>
          <h1 style={{ color: C.cream, fontSize: 26, margin: 0, fontWeight: 700 }}>
            المنار
          </h1>
          <p style={{ color: C.cream, opacity: 0.8, fontSize: 13, margin: '4px 0 0', fontFamily: 'Arial, sans-serif' }}>
            منصة التعليم الوالدي
          </p>
        </div>

        <div style={body}>
          <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
            أهلاً وسهلاً، {name}! 👋
          </p>
          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
            يسعدنا انضمامك إلى مجتمع <strong>المنار</strong> — منصة التعليم الوالدي الرائدة.
          </p>
          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            استكشف دوراتنا المتخصصة في التربية والتنمية الشخصية، وابدأ رحلتك التعليمية اليوم.
          </p>
          <div>
            <a href={coursesUrl} style={btn}>
              استكشف الدورات
            </a>
          </div>
          <div style={divider}>
            <p style={{ color: C.muted, fontSize: 12, margin: 0, lineHeight: 1.7, fontFamily: 'Arial, sans-serif' }}>
              وصلك هذا البريد لأنك أنشأت حسابًا في المنار.
              إذا لم تكن أنت، يمكنك تجاهل هذه الرسالة بأمان.
            </p>
          </div>
        </div>

        <div style={footer}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            © {year} المنار. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div dir="ltr" lang="en" style={wrap}>
      <div style={header('left')}>
        <h1 style={{ color: C.cream, fontSize: 26, margin: 0, fontWeight: 700, letterSpacing: '0.06em' }}>
          ALMANAR
        </h1>
        <p style={{ color: C.cream, opacity: 0.8, fontSize: 13, margin: '4px 0 0', fontFamily: 'Arial, sans-serif' }}>
          Parenting Education Platform
        </p>
      </div>

      <div style={body}>
        <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
          Welcome, {name}! 👋
        </p>
        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
          We&apos;re thrilled to have you join the <strong>ALMANAR</strong> community — the leading parenting education platform.
        </p>
        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
          Explore our expert-led courses on parenting, child development, and personal growth.
        </p>
        <div>
          <a href={coursesUrl} style={btn}>
            Explore Courses
          </a>
        </div>
        <div style={divider}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, lineHeight: 1.7, fontFamily: 'Arial, sans-serif' }}>
            You received this email because you created an account on ALMANAR.
            If this wasn&apos;t you, you can safely ignore this email.
          </p>
        </div>
      </div>

      <div style={footer}>
        <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif' }}>
          © {year} ALMANAR. All rights reserved.
        </p>
      </div>
    </div>
  )
}
