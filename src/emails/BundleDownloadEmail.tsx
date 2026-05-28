/**
 * BundleDownloadEmail — sent when a student purchases a product bundle.
 *
 * Lists each product in the bundle. Individual download links are NOT
 * embedded in the email (they'd be per-product); instead the email
 * sends users to their dashboard where all download links appear.
 *
 * Props:
 *   name        — buyer's display name
 *   bundleTitle — bundle title in user's locale
 *   items       — array of product titles in the bundle
 *   locale      — "ar" | "en"
 *   appUrl      — base URL
 */

import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr,
} from '@react-email/components'
import * as React from 'react'

interface Props {
  name:        string
  bundleTitle: string
  items:       string[]   // product titles
  locale:      'ar' | 'en'
  appUrl:      string
}

const BRAND = {
  primary:  '#C4622D',
  gold:     '#D4A853',
  dark:     '#3D2B1F',
  cream:    '#FAF7F2',
  sage:     '#7C9A7E',
  white:    '#FFFFFF',
  muted:    '#8B7355',
}

export function BundleDownloadEmail({
  name,
  bundleTitle,
  items,
  locale = 'ar',
  appUrl,
}: Props) {
  const isAr   = locale === 'ar'
  const dir    = isAr ? 'rtl' : 'ltr'
  const fontFamily = isAr
    ? '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif'
    : '"DM Sans", "Segoe UI", Roboto, sans-serif'

  const dashboardUrl = `${appUrl}/${locale}/dashboard`

  return (
    <Html lang={locale} dir={dir}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Body style={{ margin: 0, padding: 0, backgroundColor: BRAND.cream, fontFamily }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px' }}>

          {/* Header */}
          <Section style={{
            backgroundColor: BRAND.gold,
            borderRadius:    '14px 14px 0 0',
            padding:         '36px 32px',
            textAlign:       'center',
          }}>
            <Heading as="h1" style={{
              margin:     '0 0 6px',
              fontSize:   22,
              fontWeight: 700,
              color:      BRAND.white,
              fontFamily,
            }}>
              {isAr ? '🎁 طلبك جاهز!' : '🎁 Your Bundle is Ready!'}
            </Heading>
            <Text style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.9)', fontFamily }}>
              {isAr ? 'شكرًا لشرائك' : 'Thank you for your purchase'}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{
            backgroundColor: BRAND.white,
            padding:         '32px',
          }}>
            <Text style={{
              margin:     '0 0 8px',
              fontSize:   16,
              fontWeight: 700,
              color:      BRAND.dark,
              fontFamily,
            }}>
              {isAr ? `أهلاً ${name}،` : `Hi ${name},`}
            </Text>

            <Text style={{
              margin:     '0 0 20px',
              fontSize:   15,
              color:      '#4A3728',
              lineHeight: 1.7,
              fontFamily,
            }}>
              {isAr
                ? `اشتريت بنجاح باقة "${bundleTitle}" وجميع الملفات جاهزة للتنزيل من لوحة التحكم.`
                : `You've successfully purchased the "${bundleTitle}" bundle. All files are ready for download from your dashboard.`}
            </Text>

            {/* Bundle items */}
            <Section style={{
              backgroundColor: '#FFFBF0',
              borderRadius:    10,
              padding:         '16px 20px',
              marginBottom:    24,
              borderLeft:      isAr ? 'none' : `4px solid ${BRAND.gold}`,
              borderRight:     isAr ? `4px solid ${BRAND.gold}` : 'none',
            }}>
              <Text style={{
                margin:        '0 0 10px',
                fontSize:      12,
                fontWeight:    600,
                color:         BRAND.muted,
                fontFamily,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {isAr ? 'محتوى الباقة' : 'Bundle Contents'}
              </Text>
              {items.map((item, i) => (
                <Text key={i} style={{
                  margin:     i < items.length - 1 ? '0 0 6px' : '0',
                  fontSize:   14,
                  color:      BRAND.dark,
                  fontFamily,
                  display:    'flex',
                  alignItems: 'center',
                  gap:        8,
                }}>
                  <span style={{ color: BRAND.sage, fontWeight: 700, marginInlineEnd: 8 }}>✓</span>
                  {item}
                </Text>
              ))}
            </Section>

            {/* CTA */}
            <Button
              href={dashboardUrl}
              style={{
                display:        'inline-block',
                backgroundColor: BRAND.primary,
                color:           BRAND.white,
                fontSize:        15,
                fontWeight:      700,
                padding:         '14px 32px',
                borderRadius:    10,
                textDecoration:  'none',
                fontFamily,
              }}
            >
              {isAr ? 'تنزيل الملفات' : 'Download Files'}
            </Button>

            <Hr style={{ margin: '28px 0', borderColor: '#E8DFD5', borderWidth: 1 }} />

            <Text style={{ margin: 0, fontSize: 12, color: BRAND.muted, lineHeight: 1.6, fontFamily }}>
              {isAr
                ? 'يمكنك تنزيل كل ملف حتى 5 مرات. ستجد جميع روابط التنزيل في لوحة التحكم.'
                : 'Each file can be downloaded up to 5 times. All download links are available in your dashboard.'}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{
            backgroundColor: BRAND.dark,
            borderRadius:    '0 0 14px 14px',
            padding:         '20px 32px',
            textAlign:       'center',
          }}>
            <Text style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily }}>
              {isAr ? 'شكرًا لتسوقك مع المنار.' : 'Thank you for shopping with ALMANAR.'}
            </Text>
            <Text style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily }}>
              © {new Date().getFullYear()} ALMANAR · almanar.co
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

export default BundleDownloadEmail
