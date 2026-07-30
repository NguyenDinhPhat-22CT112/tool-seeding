import nextPlugin from "@next/eslint-plugin-next";
import nodeConfig from "./node.mjs";

export default [
  ...nodeConfig,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];
