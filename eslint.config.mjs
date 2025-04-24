import { defineConfig, globalIgnores } from 'eslint/config';
import babelParser from '@babel/eslint-parser';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import vue from 'eslint-plugin-vue';
import cypress from 'eslint-plugin-cypress';
import importPlugin from 'eslint-plugin-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig(
    [globalIgnores(['dist', 'eslint.config.mjs', '.quasar', '.postcssrc.js']),
    ...compat.extends(
        'plugin:cypress/recommended',
        'plugin:vue/vue3-strongly-recommended',
        'plugin:promise/recommended',
        'plugin:n/recommended'
      ),
    {
        plugins: { vue, cypress, import: importPlugin },
        files: ['**/*.{js,vue,mjs}'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: babelParser,
                ecmaVersion: 2022,
                sourceType: 'module',
                babelOptions: { configFile: './babel.config.js' },
            },
            globals: {
              ...globals.browser,
              __statics: true,
              'cypress/globals': true,
            },
        },
        rules: {
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            indent: ['error', 2, { SwitchCase: 1 }],
            'linebreak-style': ['error', 'unix'],
            'react/display-name': 'off',
            'n/no-missing-import': 'off',
            'max-len': ['error', { code: 120, tabWidth: 2 }],
            'no-console': ['error', { allow: ['error'] }],
            'no-trailing-spaces': 'error',
            'vue/max-attributes-per-line': 0,
            'vue/singleline-html-element-content-newline': 0,
            'vue/html-indent': 0,
            'vue/html-closing-bracket-newline': 0,
            'arrow-parens': [2, 'as-needed', { requireForBlockBody: true }],
            'vue/first-attribute-linebreak': 0,
            'vue/multi-word-component-names': 0,
            'no-param-reassign': 0,
            'import/no-extraneous-dependencies': 0,
            'import/extensions': ['error', 'never', { html: 'always' }],
            'import/prefer-default-export': 0,
            'import/no-unresolved': 0,
            'no-underscore-dangle': 0,
            'no-use-before-define': 0,
            'consistent-return': 0,
            'func-names': 0,
            'global-require': 0,
            'no-plusplus': 0,
            'default-case': 0,
            'no-restricted-globals': 0,
            'no-await-in-loop': 0,
            'no-restricted-syntax': 0,
            'no-continue': 0,
            'comma-dangle': ['error', {
                arrays: 'always-multiline',
                objects: 'always-multiline',
                imports: 'always-multiline',
                exports: 'always-multiline',
                functions: 'never',
            }],
            'object-curly-newline': ['error', { consistent: true }],
            'operator-linebreak': ['error', 'before', { overrides: { '&&': 'after', '||': 'after', '=': 'after' } }],
            'prefer-destructuring': ['error', { VariableDeclarator: { object: true, array: false } }],
    },
}]);
