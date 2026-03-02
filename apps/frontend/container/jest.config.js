module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^../shared/api/config$": "<rootDir>/src/shared/api/config.ts",
    "^../../api/config$": "<rootDir>/src/shared/api/config.ts",
    "^../../../api/config$": "<rootDir>/src/shared/api/config.ts",
    "^../../shared/api/config$": "<rootDir>/src/shared/api/config.ts",
    "^../../../shared/api/config$": "<rootDir>/src/shared/api/config.ts",
    "^../../ui/(.*)$": "<rootDir>/src/shared/ui/$1",
    "^../../../ui/(.*)$": "<rootDir>/src/shared/ui/$1",
    "^../../shared/ui/(.*)$": "<rootDir>/src/shared/ui/$1",
    "^../../../shared/ui/(.*)$": "<rootDir>/src/shared/ui/$1",
    "^../../shared/lib/utils$": "<rootDir>/src/shared/lib/utils.ts",
    "^../../../shared/lib/utils$": "<rootDir>/src/shared/lib/utils.ts",
    "^../features/(.*)$": "<rootDir>/src/features/$1",
    "^../../features/(.*)$": "<rootDir>/src/features/$1",
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        module: "esnext",
        target: "esnext"
      },
      diagnostics: {
        ignoreCodes: [1343]
      }
    }],
  },
};
