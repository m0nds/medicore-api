import type { JestConfigWithTsJest } from "ts-jest"
const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setEnv.ts"],  // remove dotenv/config
  globalSetup: "<rootDir>/tests/globalSetup.ts",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"]
}

export default config