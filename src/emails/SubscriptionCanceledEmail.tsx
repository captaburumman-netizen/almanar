/**
 * Membership cancellation email — sent when a subscription is deleted/canceled.
 *
 * Tone: warm, not punitive. Invites the user to rejoin.
 * Bilingual: Arabic (RTL) or English based on locale.
 */
import * as React from 'react'

export interface SubscriptionCanceledEmailProps {
  name:   string
  locale: string
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
  fontFamily:      'Georgia, "Times New Roman", serif',
  maxWidth:        560,
  margin:          '0 auto',
  backgroundColor: C.white,
  borderRadius:    12,
  overflow:        'hidden',
}

const outlineBtn: React.CSSProperties = {
  display:         'inline-block',
  marginTop:       24,
  padding:         '12px 30px',
  backgroundColor: 'transparent',
  color:           C.primary,
  border:          `2px solid ${C.primary}`,
  borderRadius:    8,
  textDecoration:  'none',
  fontWeight:      700,
  fontSize:        15,
}

export function SubscriptionCanceledEmail({
  name,
  locale,
  appUrl,
}: SubscriptionCanceledEmailProps) {
  const isAr      = locale === 'ar'
  const year      = new Date().getFullYear()
  const pricingUrl = `${appUrl}/${locale}/pricing`

  if (isAr) {
    return (
      <div dir="rtl" lang="ar" style={wrap}>
        <div style={{ backgroundColor: C.dark, padding: '28px 40px', textAlign: 'right' }}>
          <h1 style={{ color: C.cream, fontSize: 26, margin: 0, fontWeight: 700 }}>المنار</h1>
          <p style={{ color: C.cream, opacity: 0.6, fontSize: 13, margin: '4px 0 0', fontFamily: 'Arial, sans-serif' }}>
            منصة التعليم الوالدي
          </p>
        </div>

        <div style={{ padding: '36px 40px', backgroundColor: C.cream }}>
          <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
            نأسف لرحيلك، {name}
          </p>
          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
            تم إلغاء اشتراكك في المنار. لن يُجدَّد اشتراكك تلقائيًا في الفترة القادمة.
          </p>
          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            ستحتفظ بإمكانية الوصول إلى الدورات المجانية والمواد التي اشتريتها مسبقًا. نتمنى أن نراك مجددًا قريبًا!
          </p>

          <div style={{
            margin:          '24px 0',
            padding:         '16px 20px',
            backgroundColor: C.white,
            borderRadius:    8,
            borderRight:     `4px solid ${C.muted}`,
          }}>
            <p style={{ color: C.medium, fontSize: 14, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
              إذا ألغيت بسبب مشكلة أو سؤال، فريق الدعم هنا للمساعدة على{' '}
              <a href="mailto:support@almanar.co" style={{ color: C.primary }}>support@almanar.co</a>
            </p>
          </div>

          <div>
            <a href={pricingUrl} style={outlineBtn}>
              تجديد الاشتراك
            </a>
          </div>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
              وصلك هذا البريد لأن اشتراكك في المنار قد انتهى.
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
      <div style={{ backgroundColor: C.dark, padding: '28px 40px', textAlign: 'left' }}>
        <h1 style={{ color: C.cream, fontSize: 26, margin: 0, fontWeight: 700, letterSpacing: '0.06em' }}>ALMANAR</h1>
        <p style={{ color: C.cream, opacity: 0.6, fontSize: 13, margin: '4px 0 0', fontFamily: 'Arial, sans-serif' }}>
          Parenting Education Platform
        </p>
      </div>

      <div style={{ padding: '36px 40px', backgroundColor: C.cream }}>
        <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
          We&apos;re sad to see you go, {name}
        </p>
        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
          Your ALMANAR membership has been canceled and will not renew.
        </p>
        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
          You&apos;ll keep access to any free courses and content you&apos;ve purchased. We hope to see you back soon!
        </p>

        <div style={{
          margin:         '24px 0',
          padding:        '16px 20px',
          backgroundColor: C.white,
          borderRadius:   8,
          borderLeft:     `4px solid ${C.muted}`,
        }}>
          <p style={{ color: C.medium, fontSize: 14, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
            If you canceled due to an issue or have questions, our support team is here at{' '}
            <a href="mailto:support@almanar.co" style={{ color: C.primary }}>support@almanar.co</a>
          </p>
        </div>

        <div>
          <a href={pricingUrl} style={outlineBtn}>
            Renew Membership
          </a>
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
            You received this email because your ALMANAR membership has ended.
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
