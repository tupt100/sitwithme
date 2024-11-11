module.exports = {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "collectCoverage": true,
  "verbose": true,
  "resetMocks": true,
  "collectCoverageFrom": [
    `<rootDir>/core/**/${process.env.FILE || '*'}.ts`
  ],
  "testRegex": `${process.env.FILE || ''}.spec.ts$`,
  "transform": {
    ".(ts|tsx)": 'ts-jest'
  },
  "moduleNameMapper": {
    "@swm-core/(.*)": "<rootDir>/core/$1"
  }
}
