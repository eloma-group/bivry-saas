import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * What this linter is here for.
 *
 * `tsc` already runs on every build and in CI, with `noUnusedLocals` and
 * `noUnusedParameters` on, so type errors and dead variables are caught before
 * this ever runs. Repeating those here would only produce two voices saying the
 * same thing.
 *
 * What it adds is the one class of mistake TypeScript cannot see: the rules of
 * hooks. A `useEffect` missing a dependency type checks perfectly and then
 * reads a stale value at runtime, which is painful to find by hand and easy to
 * find here. That is why `react-hooks` is the part of this config turned all
 * the way up.
 *
 * Run it with `npm run lint`, or `npm run lint:fix` to apply what is fixable.
 */
export default tseslint.config(
  // Build output and dependencies are not ours to lint.
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // The reason this config exists. A missing dependency is a stale render
      // waiting to happen, so it is an error rather than a warning.
      "react-hooks/exhaustive-deps": "error",

      // Fast refresh only works when a module exports components and nothing
      // else. A constant exported beside one silently breaks hot reloading, so
      // this warns rather than errors: it costs developer time, not correctness.
      //
      // Four files trip it today and are meant to: `badge` and `button` export
      // their variants beside the component, and the two contexts export their
      // own hook beside the provider. Both are the established shape for what
      // they are, and splitting them would be churn for nothing. The rule earns
      // its place on the files nobody has written yet.
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Unused code belongs to `tsc`, which has `noUnusedLocals` and
      // `noUnusedParameters` on and runs on every build and in CI. Both rules
      // are off here so nothing is reported twice.
      //
      // The base rule in particular has to be off rather than tuned: it reads a
      // TypeScript type signature as if it were a function body, so the names
      // in `link: (documentId: string) => Promise<...>` come back as unused
      // variables. They are documentation, not bindings.
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
    },
  },

  // Config files run in Node, not the browser, and are plain JavaScript.
  {
    files: ["*.config.{js,ts}", "vite.config.ts", "tailwind.config.js", "postcss.config.js"],
    languageOptions: { globals: globals.node },
  },
);
