/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    "@swm-core/(.*)": "<rootDir>/core/$1",
    "@swm-test/(.*)": "<rootDir>/test/$1"
  },
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  resetMocks: true,
  silent: true,
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/core/services/**/*.ts',
    '<rootDir>/core/utils/**/*.ts'
  ],
  coverageReporters: ["text"]
};


// module.exports = {
//   "moduleFileExtensions": ["js", "json", "ts"],
//   "rootDir": ".",
//   "testEnvironment": "node",
//   "collectCoverage": true,
//   "verbose": true,
//   "resetMocks": true,
//   "collectCoverageFrom": [
//     `<rootDir>/core/**/${process.env.FILE || '*'}.ts`
//   ],
//   "testRegex": `${process.env.FILE || ''}.spec.ts$`,
//   "transform": {
//     ".(ts|tsx)": 'ts-jest'
//   },
//   "moduleNameMapper": {
//     "@swm-core/(.*)": "<rootDir>/core/$1"
//   }
// }
