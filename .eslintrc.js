module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'simple-import-sort'],
  ignorePatterns: ['**/migration/*.ts', 'rpc-types.d.ts'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  rules: {
    // fixable rules
    curly: [2, 'all'],
    quotes: [2, 'single', { avoidEscape: true }],
    'sort-imports': 0,
    'import/order': 0,
    'simple-import-sort/imports': 2,
    'simple-import-sort/exports': 2,
    'import/first': 2,
    'import/newline-after-import': 2,
    'import/no-duplicates': 2,
    'import/no-extraneous-dependencies': 2,
    // compatible with other tools like prettier and so on
    '@typescript-eslint/member-delimiter-style': [
      2,
      {
        singleline: {
          delimiter: 'semi',
          requireLast: true,
        },
        multiline: {
          delimiter: 'semi',
          requireLast: true,
        },
      },
    ],
    // other rules we dont want to use
    // ...
  },
};
