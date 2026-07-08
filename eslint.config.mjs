import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Ignore build artifacts — without this, lint scans .next/ and out/
    // producing 6000+ false positives from generated code.
    ignores: [".next/**", "out/**", "node_modules/**", "bun.lock"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow console for debugging — this is a client-side app
      "no-console": "off",
      // Warn on unused vars — clean up gradually
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Allow explicit any for LLM responses — their schema is unpredictable
      "@typescript-eslint/no-explicit-any": "off",
      // Don't require return types on every function
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // No unrecoverable code
      "no-unreachable": "error",
      "no-debugger": "error",
      "prefer-const": "error",
    },
  },
);
