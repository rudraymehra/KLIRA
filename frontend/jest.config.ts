import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/jest.polyfills.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/src/__tests__/test-utils\\.tsx$",
  ],
  transformIgnorePatterns: [
    "/node_modules/(?!(@lightprotocol|@coral-xyz|@solana|bn\\.js)/)",
  ],
};

export default createJestConfig(config);
