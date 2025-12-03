module.exports = [
  // Global ignores for non-source outputs and generated assets
  {
    ignores: [
      "lib/**",
      "docs/**",
      "example/ios/build/**",
      "example/android/build/**",
    ],
  },
  // JS files rules (applies to remaining non-ignored JS)
  {
    files: ["**/*.js"],
    rules: {
      semi: "error",
      "prefer-const": "error",
    },
  },
  // TS/TSX rules for source
  // TypeScript parsing for src (no plugin rules needed)
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {
      // Disable rules from plugins not configured in this project
      "react-native/no-inline-styles": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];