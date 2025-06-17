module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
    "*.js", // Ignore all JS files (test scripts)
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "require-jsdoc": "off", // 一旦無効化する。将来有効化するかも？
    "valid-jsdoc": "off", // Disable JSDoc validation
    "max-len": ["error", {"code": 120}], // Increase line length limit
    "@typescript-eslint/no-explicit-any": "warn", // Downgrade any type warnings
  },
};
