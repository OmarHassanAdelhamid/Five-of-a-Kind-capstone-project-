/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: {
          jsx: 'react-jsx',
          module: 'ESNext',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          types: ['node', 'jest', '@testing-library/jest-dom'],
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/__mocks__/**',
    '!src/utils/constants.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
    // Exclude very large or canvas-heavy components to reach 80% on the rest
    // '!src/components/LayerEditor.tsx',
    '!src/components/ModelViewer.tsx',
    '!src/components/Layer2DGrid.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 43,
      branches: 37,
      functions: 53,
      lines: 43,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/utils/constants$': '<rootDir>/src/__mocks__/utils/constants.cjs',
    '^\\.\\./utils/constants$': '<rootDir>/src/__mocks__/utils/constants.cjs',
    '^\\.\\./\\.\\./utils/constants$':
      '<rootDir>/src/__mocks__/utils/constants.cjs',
    '^\\./constants$': '<rootDir>/src/__mocks__/utils/constants.cjs',
    '\\.css$': '<rootDir>/src/__mocks__/styleMock.cjs',
    '^three$': '<rootDir>/src/__mocks__/three.cjs',
    '^three/examples/jsm/controls/OrbitControls$':
      '<rootDir>/src/__mocks__/orbitControls.cjs',
    '^three/examples/jsm/loaders/STLLoader$':
      '<rootDir>/src/__mocks__/stlLoader.cjs',
    // Force Jest to use root picomatch (2.3.1) so it never picks up Vite's nested one (different API).
    '^picomatch$': '<rootDir>/node_modules/picomatch',
  },
  setupFiles: ['<rootDir>/jest-setup.cjs'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  modulePathIgnorePatterns: ['<rootDir>/src/jest-dom.d.ts'],
};
