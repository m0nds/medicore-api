import type { JestConfigWithTsJest } from "ts-jest"
const config: JestConfigWithTsJest = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    testMatch: ["**/*.test.ts"],
    setupFiles: ["dotenv/config"],  // ← add this
    moduleNameMapper: {
      "^@/(.*)$": "<rootDir>/src/$1"
    }
  }

export default config