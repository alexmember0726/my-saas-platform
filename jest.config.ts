// jest.config.js

import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',

  verbose: true,
  
  // NOTE: If you are testing API routes, you should consider changing this 
  // back to 'node' or 'next/jest-environment' as discussed previously, 
  // otherwise you might run into the 'Request is not defined' error again 
  // when testing API routes. For now, let's fix the path issue first.
  testEnvironment: 'node',

  // Add back the moduleNameMapper to resolve the '@/...' imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.node.setup.ts'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)