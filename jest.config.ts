import type { JestConfigWithTsJest } from "ts-jest"
const config: JestConfigWithTsJest = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    testMatch: ["**/*.test.ts"],
    setupFiles: ["dotenv/config", "<rootDir>/tests/setEnv.ts"],
    globalSetup: "<rootDir>/tests/globalSetup.ts",
    testEnvironmentOptions: {},
    moduleNameMapper: {
      "^@/(.*)$": "<rootDir>/src/$1"
    },
    transformIgnorePatterns: ["node_modules/(?!(uuid)/)"]
  }

export default config