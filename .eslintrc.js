module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module'
  },
  env: { browser: true},
  extends: ['plugin:vue/essential', 'plugin:cypress/recommended', 'standard' ],
  plugins: ['vue', 'cypress'],
  globals: {
    'ga': true, // Google Analytics
    '__statics': true,
    'cypress/globals': true
  },
  rules: {
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'react/display-name': 'off',
    'max-len': ['error', { code: 120, tabWidth: 2 }],
    'no-console': ['error', { allow: ['error'] }],
    'no-trailing-spaces': 'error',
    "indent": ["error", 2, { SwitchCase: 1 }],
    // Un-used AirBnb rules
    'import/no-extraneous-dependencies': 0,
    'import/extensions': 0,
    'import/prefer-default-export': 0,
    'import/no-unresolved': 0,
    'no-underscore-dangle': 0,
    'no-use-before-define': 0,
    'func-names': 0,
    'global-require': 0,
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
      },
    ],
    'object-curly-newline': ['error', { consistent: true }],
    'operator-linebreak': ['error', 'before', { overrides: { '&&': 'after', '||': 'after' } }],
    'arrow-parens': [2, 'as-needed', { requireForBlockBody: true }],
    // 'import/first': 'off',
    // 'import/named': 'error',
    // 'import/namespace': 'error',
    // 'import/default': 'error',
    // 'import/export': 'error',
    // 'prefer-promise-reject-errors': 'off',
    // 'generator-star-spacing': 'off',
    // 'one-var': 0,
    // 'import/named': 2,
    // 'import/namespace': 2,
    // 'import/default': 2,
    // 'import/export': 2,
    // 'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
  }
}
