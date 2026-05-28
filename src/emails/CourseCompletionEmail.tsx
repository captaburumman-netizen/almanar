/**
 * CourseCompletionEmail — sent when a student finishes every lesson in a course.
 *
 * Props:
 *   name        — student's display name (or fallback "طالب" / "Student")
 *   courseTitle — course title in the user's locale
 *   courseSlug  — for the "Review Course" CTA link
 *   locale      — "ar" | "en"
 *   appUrl      — base URL (e.g. https://almanar.co)
 */

import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Row, Column,
} from '@react-email/components'
import * as React from 'react'

interface Props {
  name:        string
  courseTitle: string
  courseSlug:  string
  locale:      'ar' | 'en'
  appUrl:      string
}

const BRAND = {
  primary:    '#C4622D',
  gold:       '#D4A853',
  dark:       '#3D2B1F',
  cream:      '#FAF7F2',
  sage:       '#7C9A7E',
  white:      '#FFFFFF',
  muted:      '#8B7355',
}

export function CourseCompletionEmail({
  name,
  courseTitle,
  courseSlug,
  locale = 'ar',
  appUrl,
}: Props) {
  const isAr   = locale === 'ar'
  const dir    = isAr ? 'rtl' : 'ltr'
  const fontFamily = isAr
    ? '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif'
    : '"DM Sans", "Segoe UI", Roboto, sans-serif'

  const reviewUrl = `${appUrl}/${locale}/courses/${courseSlug}/learn`

  const subject      = isAr ? `تهانينا! أتممت دورة "${courseTitle}"` : `Congratulations! You completed "${courseTitle}"`
  const greeting     = isAr ? `أحسنت، ${name}!` : `Well done, ${name}!`
  const bodyText     = isAr
    ? `لقد أتممت جميع دروس دورة "${courseTitle}" بنجاح. هذا إنجاز رائع — استمر في رحلتك التعليمية.`
    : `You've successfully completed all lessons in "${courseTitle}". This is a fantastic achievement — keep up the great work.`
  const ctaLabel     = isAr ? 'مراجعة الدورة' : 'Review the Course'
  const footerText   = isAr ? 'شكرًا لتعلمك مع المنار.' : 'Thank you for learning with ALMANAR.'

  return (
    <Html lang={locale} dir={dir}>
      <Head>
        <title>{subject}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Body style={{ margin: 0, padding: 0, backgroundColor: BRAND.cream, fontFamily }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px' }}>

          {/* Header */}
          <Section style={{
            backgroundColor: BRAND.primary,
            borderRadius:    '14px 14px 0 0',
            padding:         '36px 32px',
            textAlign:       'center',
          }}>
            {/* Trophy icon SVG inline */}
            <div style={{
              display:         'inline-flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:           64,
              height:          64,
              borderRadius:    '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              marginBottom:    16,
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={BRAND.white} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
              </svg>
            </div>

            <Heading as="h1" style={{
              margin:       '0 0 8px',
              fontSize:     22,
              fontWeight:   700,
              color:        BRAND.white,
              lineHeight:   1.3,
              fontFamily,
            }}>
              {isAr ? '🎉 تهانينا!' : '🎉 Congratulations!'}
            </Heading>
            <Text style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.85)', fontFamily }}>
              {isAr ? 'أتممت الدورة بالكامل' : 'Course completed successfully'}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{
            backgroundColor: BRAND.white,
            padding:         '32px',
          }}>
            <Heading as="h2" style={{
              margin:     '0 0 12px',
              fontSize:   18,
              fontWeight: 700,
              color:      BRAND.dark,
              fontFamily,
            }}>
              {greeting}
            </Heading>

            <Text style={{
              margin:     '0 0 20px',
              fontSize:   15,
              color:      '#4A3728',
              lineHeight: 1.7,
              fontFamily,
            }}>
              {bodyText}
            </Text>

            {/* Gold achievement badge */}
            <Row style={{ marginBottom: 24 }}>
              <Column style={{
                backgroundColor: '#FFFBF0',
                borderRadius:    10,
                padding:         '16px 20px',
                borderLeft:      isAr ? 'none'               : `4px solid ${BRAND.gold}`,
                borderRight:     isAr ? `4px solid ${BRAND.gold}` : 'none',
              }}>
                <Text style={{
                  margin:     0,
                  fontSize:   13,
                  color:      BRAND.muted,
                  fontFamily,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {isAr ? 'الدورة المكتملة' : 'Completed Course'}
                </Text>
                <Text style={{
                  margin:     '4px 0 0',
                  fontSize:   16,
                  color:      BRAND.dark,
                  fontWeight: 700,
                  fontFamily,
                }}>
                  {courseTitle}
                </Text>
              </Column>
            </Row>

            {/* CTA */}
            <Button
              href={reviewUrl}
              style={{
                display:         'inline-block',
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
              {ctaLabel}
            </Button>

            <Hr style={{ margin: '28px 0', borderColor: '#E8DFD5', borderWidth: 1 }} />

            <Text style={{ margin: 0, fontSize: 13, color: BRAND.muted, lineHeight: 1.6, fontFamily }}>
              {isAr
                ? 'اكتشف مزيدًا من الدورات والموارد لمواصلة رحلتك كوالد مثالي.'
                : 'Explore more courses and resources to continue your parenting journey.'}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{
            backgroundColor: BRAND.dark,
            borderRadius:    '0 0 14px 14px',
            padding:         '20px 32px',
            textAlign:       'center',
          }}>
            <Text style={{
              margin:   0,
              fontSize: 12,
              color:    'rgba(255,255,255,0.6)',
              fontFamily,
            }}>
              {footerText}
            </Text>
            <Text style={{
              margin:   '6px 0 0',
              fontSize: 11,
              color:    'rgba(255,255,255,0.4)',
              fontFamily,
            }}>
              © {new Date().getFullYear()} ALMANAR · almanar.co
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

export default CourseCompletionEmail
