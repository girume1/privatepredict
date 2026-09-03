import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["eslint.config.mjs", "dist/"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
