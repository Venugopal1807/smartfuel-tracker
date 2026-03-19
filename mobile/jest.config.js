module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["@testing-library/react-native/extend-expect"],
  testMatch: ["**/src/tests/**/*.test.ts?(x)"],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-clone-referenced-element|@react-navigation|expo-.*)/)",
  ],
};
