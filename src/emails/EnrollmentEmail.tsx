/**
 * Enrollment confirmation email — sent when a user completes a course purchase
 * or is granted membership access.
 *
 * Bilingual: Arabic (RTL) or English based on locale.
 */
import * as React from 'react'

export interface EnrollmentEmailProps {
  name:        string
  courseTitle: string
  courseSlug:  string
  locale:      string
  appUrl:      string
}

const C = {
  primary: '#C4622D',
  dark:    '#3D2B1F',
  medium:  '#5C4033',
  cream:   '#FAF7F2',
  muted:   '#9A8778',
  border:  '#E8DDD5',
  white:   '#FFFFFF',
  success: '#14532D',
  succBg:  '#DCFCE7',
}

const wrap: React.CSSProperties = {
  fontFamily:      'Georgia, "Times New Roman", serif',
  maxWidth:        560,
  margin:          '0 auto',
  backgroundColor: C.white,
  borderRadius:    12,
  overflow:        'hidden',
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
}

const badge: React.CSSProperties = {
  display:         'inline-block',
  padding:         '4px 12px',
  backgroundColor: C.succBg,
  color:           C.success,
  borderRadius:    20,
  fontSize:        12,
  fontWeight:      700,
  fontFamily:      'Arial, sans-serif',
  marginBottom:    16,
}

export function EnrollmentEmail({
  name,
  courseTitle,
  courseSlug,
  locale,
  appUrl,
}: EnrollmentEmailProps) {
  const isAr     = locale === 'ar'
  const year     = new Date().getFullYear()
  const learnUrl = `${appUrl}/${locale}/courses/${courseSlug}/learn`

  if (isAr) {
    return (
      <div dir="rtl" lang="ar" style={wrap}>
        <div style={{ backgroundColor: C.primary, padding: '28px 40px', textAlign: 'right' }}>
          <h1 style={{ color: C.cream, fontSize: 26, margin: 0, fontWeight: 700 }}>المنار</h1>
          <p style={{ color: C.cream, opacity: 0.8, fontSize: 13, margin: '4px 0 0', fontFamily: 'Arial, sans-serif' }}>
            منصة التعليم الوالدي
          </p>
        </div>

        <div style={{ padding: '36px 40px', backgroundColor: C.cream }}>
          <div style={badge}>✓ تم التسجيل بنجاح</div>

          <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
            مبروك، {name}!
          </p>
          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
            لقد سُجِّلت بنجاح في:
          </p>

          <div style={{
            margin:          '16px 0',
            padding:         '16px 20px',
            backgroundColor: C.white,
            borderRadius:    8,
            borderRight:     `4px solid ${C.primary}`,
          }}>
            <p style={{ color: C.dark, fontSize: 17, fontWeight: 700, margin: 0, fontFamily: 'Arial, sans-serif' }}>
              {courseTitle}
            </p>
          </div>

          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            يمكنك الآن الوصول إلى جميع دروس الدورة. ابدأ التعلم متى تشاء.
          </p>
          <div>
            <a href={learnUrl} style={btn}>
              ابدأ التعلم الآن
            </a>
          </div>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
              يمكنك الوصول إلى الدورة في أي وقت من لوحة التحكم الخاصة بك.
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: C.dark, padding: '20px 40px', textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            © {year} المنار. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div dir="ltr" lang="en" style={wrap}>
      <div style={{ backgroundColor: C.primary, padding: '28px 40px', textAlign: 'left' }}>
        <h1 style={{ color: C.cream, fontSize: 26, margin: 0, fontWeight: 700, letterSpacing: '0.06em' }}>ALMANAR</h1>
        <p style={{ color: C.cream, opacity: 0.8, fontSize: 13, margin: '4px 0 0', fontFamily: 'Arial, sans-serif' }}>
          Parenting Education Platform
        </p>
      </div>

      <div style={{ padding: '36px 40px', backgroundColor: C.cream }}>
        <div style={badge}>✓ Enrollment confirmed</div>

        <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
          Congratulations, {name}!
        </p>
        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
          You&apos;ve been successfully enrolled in:
        </p>

        <div style={{
          margin:         '16px 0',
          padding:        '16px 20px',
          backgroundColor: C.white,
          borderRadius:   8,
          borderLeft:     `4px solid ${C.primary}`,
        }}>
          <p style={{ color: C.dark, fontSize: 17, fontWeight: 700, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            {courseTitle}
          </p>
        </div>

        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
          You now have full access to all lessons. Start learning whenever you&apos;re ready.
        </p>
        <div>
          <a href={learnUrl} style={btn}>
            Start Learning Now
          </a>
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
            You can access this course at any time from your dashboard.
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: C.dark, padding: '20px 40px', textAlign: 'center' }}>
        <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif' }}>
          © {year} ALMANAR. All rights reserved.
        </p>
      </div>
    </div>
  )
}
