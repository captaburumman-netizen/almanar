/**
 * Download-ready email — sent after a product purchase or free claim.
 *
 * Contains a one-click download link (opaque token, no auth required).
 * Warns the user that the link expires and has a limited use count.
 *
 * Bilingual: Arabic (RTL) or English based on locale.
 */
import * as React from 'react'

export interface DownloadEmailProps {
  name:         string
  productTitle: string
  downloadUrl:  string
  locale:       string
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

const dlBtn: React.CSSProperties = {
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

const infoBox: React.CSSProperties = {
  marginTop:       20,
  padding:         '12px 16px',
  backgroundColor: '#FFF7ED',
  borderRadius:    6,
  borderLeft:      '3px solid #C4622D',
}

export function DownloadEmail({
  name,
  productTitle,
  downloadUrl,
  locale,
}: DownloadEmailProps) {
  const isAr = locale === 'ar'
  const year = new Date().getFullYear()

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
          <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
            ملفك جاهز للتنزيل! 📥
          </p>
          <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
            مرحبًا {name}، شكرًا لثقتك بالمنار. ملفك جاهز:
          </p>

          <div style={{
            margin:          '16px 0',
            padding:         '16px 20px',
            backgroundColor: C.white,
            borderRadius:    8,
            borderRight:     `4px solid ${C.primary}`,
          }}>
            <p style={{ color: C.dark, fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'Arial, sans-serif' }}>
              {productTitle}
            </p>
          </div>

          <div>
            <a href={downloadUrl} style={dlBtn}>
              تنزيل الملف الآن
            </a>
          </div>

          <div style={{ ...infoBox, borderLeft: 'none', borderRight: '3px solid #C4622D' }}>
            <p style={{ color: C.medium, fontSize: 13, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.6 }}>
              <strong>تنبيه:</strong> رابط التنزيل صالح لعدد محدود من الاستخدامات. يُرجى حفظ الملف فور تنزيله.
            </p>
          </div>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
              إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:
            </p>
            <p style={{ color: C.primary, fontSize: 11, margin: '4px 0 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {downloadUrl}
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
        <p style={{ color: C.dark, fontSize: 20, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }}>
          Your download is ready! 📥
        </p>
        <p style={{ color: C.medium, fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }}>
          Hi {name}, thank you for your purchase. Your file is ready:
        </p>

        <div style={{
          margin:         '16px 0',
          padding:        '16px 20px',
          backgroundColor: C.white,
          borderRadius:   8,
          borderLeft:     `4px solid ${C.primary}`,
        }}>
          <p style={{ color: C.dark, fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'Arial, sans-serif' }}>
            {productTitle}
          </p>
        </div>

        <div>
          <a href={downloadUrl} style={dlBtn}>
            Download Now
          </a>
        </div>

        <div style={infoBox}>
          <p style={{ color: C.medium, fontSize: 13, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.6 }}>
            <strong>Note:</strong> This download link has a limited number of uses. Please save the file once downloaded.
          </p>
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
            If the button doesn&apos;t work, copy and paste this URL into your browser:
          </p>
          <p style={{ color: C.primary, fontSize: 11, margin: '4px 0 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {downloadUrl}
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
