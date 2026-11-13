// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
// Turns off stylistic rules that Prettier owns, so the two never disagree.
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'android/*'],
  },
]);
