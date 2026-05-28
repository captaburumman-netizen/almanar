import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  // The locale coming from the URL segment ([locale])
  let locale = await requestLocale

  // Fallback to defaultLocale if the segment is missing or unrecognised
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,

    // Fail hard during development if a translation key is missing
    onError(error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[next-intl]', error.message)
      }
    },

    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join('.')
    },
  }
})
