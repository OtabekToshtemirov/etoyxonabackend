module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
  },
  testTimeout: 30000,
};
