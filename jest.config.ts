import type { Config } from "jest";

const config: Config = {
  displayName: "unit",
  testEnvironment: "node",
  testMatch: ["**/__tests__/unit/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "node",
          paths: { "@/*": ["./src/*"] },
          esModuleInterop: true,
          strict: false,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  clearMocks: true,
};

export default config;
