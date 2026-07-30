import config from "@seeding/eslint-config/node";

export default [
  ...config,
  {
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ["./tsconfig.json", "./tsconfig.spec.json", "./tsconfig.e2e.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
