import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  setupFiles:      ['<rootDir>/jest.setup.ts'],
  transform: {
    // Use ts-jest for all .ts/.tsx files, override jsx to react-jsx so JSX
    // compiles correctly inside Jest (tsconfig uses "preserve" for Next.js build)
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    // Resolve @/ path alias — same as tsconfig paths
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch:         ['**/__tests__/**/*.test.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/app/api/**/*.ts',
    'src/lib/**/*.ts',
    '!src/lib/db.ts',     // Prisma singleton — mocked in tests
    '!src/lib/s3.ts',     // AWS SDK wrapper — mocked in tests
    '!src/lib/resend.ts', // Resend wrapper — mocked in tests
  ],
}

export default config
