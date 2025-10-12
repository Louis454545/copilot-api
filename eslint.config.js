import config from "@echristian/eslint-config"

export default config(
  {
    prettier: {
      plugins: ["prettier-plugin-packagejson"],
    },
  },
  {
    files: ["tests/**/*.test.ts"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
)
