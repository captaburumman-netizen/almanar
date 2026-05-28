/**
 * Membership activation email — sent when a new subscription becomes ACTIVE
 * or TRIALING.
 *
 * Bilingual: Arabic (RTL) or English based on locale.
 */
import * as React from 'react'

export interface SubscriptionEmailProps {
  name:     string
  planName: string
  interval: 'MONTHLY' | 'ANNUAL'
  locale:   string
  appUrl:   string
}

const C = {
  primary: '#C4622D',
  dark:    '#3D2B1F',
  medium:  '#5C4033',
  cream:   '#FAF7F2',
  muted:   '#9A8778',
  border:  '#E8DDD5',
  white:   '#FFFFFF',
  gold:    '#92400E',
  goldBg:  '#FEF3C7',
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
  backgroundColor: C.goldBg,
  color:           C.gold,
  borderRadius:    20,
  fontSize:        12,
  fontWeight:      700,
  fontFamily:      'Arial, sans-serif',
  marginBottom:    16,
}

export function SubscriptionEmail({
  name,
  planName,
  interval,
  locale,
  appUrl,
}: SubscriptionEmailProps) {
  const isAr       = locale === 'ar'
  const year       = new Date().getFullYear()
  const coursesUrl = `${appUrl}/${locale}/courses`

  const intervalLabelAr = interval === 'ANNUAL' ? 'سنوي'  : 'شهري'
  const intervalLabelEn = interval === 'ANNUAL' ? 'Annual' : 'Monthly'

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
          <div style={badge}>★ عضوية مفعّلة</div>

          <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
            مرحبًا بك في العضوية، {name}!
          </p>
          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 16px', fontFamily: 'Arial, sans-serif' }}>
            تم تفعيل اشتراكك بنجاح. أنت الآن عضو في:
          </p>

          <div style={{
            padding:         '16px 20px',
            backgroundColor: C.white,
            borderRadius:    8,
            borderRight:     `4px solid ${C.primary}`,
            marginBottom:    16,
          }}>
            <p style={{ color: C.dark, fontSize: 17, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Arial, sans-serif' }}>
              {planName}
            </p>
            <p style={{ color: C.muted, fontSize: 13, margin: 0, fontFamily: 'Arial, sans-serif' }}>
              اشتراك {intervalLabelAr}
            </p>
          </div>

          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            يمكنك الآن الوصول إلى جميع الدورات الحصرية للأعضاء. استمتع بتجربة تعليمية لا حدود لها!
          </p>
          <div>
            <a href={coursesUrl} style={btn}>
              استكشف دورات الأعضاء
            </a>
          </div>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
              لإدارة اشتراكك أو إلغائه، تفضل بزيارة{' '}
              <a href={`${appUrl}/${locale}/dashboard`} style={{ color: C.primary }}>لوحة التحكم</a>.
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
        <div style={badge}>★ Membership active</div>

        <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
          Welcome to membership, {name}!
        </p>
        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 16px', fontFamily: 'Arial, sans-serif' }}>
          Your subscription has been activated. You&apos;re now a member of:
        </p>

        <div style={{
          padding:        '16px 20px',
          backgroundColor: C.white,
          borderRadius:   8,
          borderLeft:     `4px solid ${C.primary}`,
          marginBottom:   16,
        }}>
          <p style={{ color: C.dark, fontSize: 17, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Arial, sans-serif' }}>
            {planName}
          </p>
          <p style={{ color: C.muted, fontSize: 13, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            {intervalLabelEn} subscription
          </p>
        </div>

        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
          You now have unlimited access to all member-exclusive courses. Enjoy your learning journey!
        </p>
        <div>
          <a href={coursesUrl} style={btn}>
            Explore Member Courses
          </a>
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
            To manage or cancel your subscription, visit your{' '}
            <a href={`${appUrl}/${locale}/dashboard`} style={{ color: C.primary }}>dashboard</a>.
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
