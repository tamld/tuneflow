export default [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        module: "readonly",
        exports: "readonly",
        require: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        fetch: "readonly",
        EventSource: "readonly",
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        confirm: "readonly",
        alert: "readonly",
        Audio: "readonly",
        MediaMetadata: "readonly",
        URL: "readonly",
        AbortController: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrors": "none" }],
      "no-empty": ["warn", { "allowEmptyCatch": true }],
      "no-undef": "error"
    }
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      sourceType: "script"
    }
  },
  {
    ignores: ["node_modules/**", "downloads/**", "coverage/**"]
  }
];
