module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/tests/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/mobile/"],
  verbose: true,
};
