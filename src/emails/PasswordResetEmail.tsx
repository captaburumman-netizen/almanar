/**
 * Password reset email — sent when the user requests a reset link.
 * Bilingual: Arabic (RTL) or English based on the locale prop.
 */
import * as React from 'react'

interface PasswordResetEmailProps {
  resetUrl: string
  locale:   string
}

const C = {
  primary: '#C4622D',
  dark:    '#3D2B1F',
  medium:  '#5C4033',
  cream:   '#FAF7F2',
  muted:   '#9A8778',
  border:  '#E8DDD5',
  white:   '#FFFFFF',
  warning: '#7C3D12',
  warnBg:  '#FEF3C7',
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

const warnBox: React.CSSProperties = {
  marginTop:       20,
  padding:         '12px 16px',
  backgroundColor: C.warnBg,
  borderRadius:    6,
  borderLeft:      `3px solid ${C.warning}`,
}

export function PasswordResetEmail({ resetUrl, locale }: PasswordResetEmailProps) {
  const isAr = locale === 'ar'
  const year = new Date().getFullYear()

  if (isAr) {
    return (
      <div dir="rtl" lang="ar" style={wrap}>
        <div style={{ backgroundColor: C.primary, padding: '28px 40px', textAlign: 'right' }}>
          <h1 style={{ color: C.cream, fontSize: 26, margin: 0, fontWeight: 700 }}>المنار</h1>
        </div>

        <div style={{ padding: '36px 40px', backgroundColor: C.cream }}>
          <h2 style={{ color: C.dark, fontSize: 18, margin: '0 0 16px', fontFamily: 'Arial, sans-serif' }}>
            إعادة تعيين كلمة المرور
          </h2>
          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
            تلقّينا طلبًا لإعادة تعيين كلمة مرور حسابك في المنار.
          </p>
          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            انقر الزر أدناه لإنشاء كلمة مرور جديدة. الرابط صالح لمدة <strong>ساعة واحدة</strong> فقط.
          </p>
          <div>
            <a href={resetUrl} style={btn}>
              إعادة تعيين كلمة المرور
            </a>
          </div>
          <div style={warnBox}>
            <p style={{ color: C.warning, fontSize: 13, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.6 }}>
              إذا لم تطلب إعادة التعيين، يُرجى تجاهل هذا البريد.
              حسابك آمن ولن يتغير شيء.
            </p>
          </div>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
              إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:
            </p>
            <p style={{ color: C.primary, fontSize: 11, margin: '4px 0 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {resetUrl}
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
      </div>

      <div style={{ padding: '36px 40px', backgroundColor: C.cream }}>
        <h2 style={{ color: C.dark, fontSize: 18, margin: '0 0 16px', fontFamily: 'Arial, sans-serif' }}>
          Password Reset
        </h2>
        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
          We received a request to reset the password for your ALMANAR account.
        </p>
        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: 0, fontFamily: 'Arial, sans-serif' }}>
          Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <div>
          <a href={resetUrl} style={btn}>
            Reset Password
          </a>
        </div>
        <div style={warnBox}>
          <p style={{ color: C.warning, fontSize: 13, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.6 }}>
            If you didn&apos;t request a password reset, please ignore this email.
            Your account is safe and nothing will change.
          </p>
        </div>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
            If the button doesn&apos;t work, copy and paste this URL into your browser:
          </p>
          <p style={{ color: C.primary, fontSize: 11, margin: '4px 0 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {resetUrl}
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
