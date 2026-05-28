/**
 * Global Jest setup.
 *
 * Sets required environment variables so modules that read from process.env
 * at import time don't throw during unit tests.
 */

process.env.NEXTAUTH_SECRET     = 'test-secret-do-not-use-in-prod'
process.env.DATABASE_URL        = 'postgresql://test:test@localhost:5432/test'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.RESEND_API_KEY      = 'test_resend_key'
process.env.STRIPE_SECRET_KEY   = 'sk_test_dummy_key_for_jest'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy_secret_for_jest'
