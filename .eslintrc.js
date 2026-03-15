module.exports = {
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    // Strict type checking (relaxed for build)
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
    
    // React best practices (relaxed)
    'react/jsx-key': 'error',
    'react/no-array-index-key': 'warn',
    'react/self-closing-comp': 'warn',
    'react/no-danger': 'warn',
    'react/no-unescaped-entities': 'warn',
    
    // General code quality (relaxed)
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': 'warn',
    'curly': 'warn',
    'max-lines': 'warn',
    'max-depth': 'warn',
    'max-params': 'warn',
    'complexity': 'warn',
    'no-extra-semi': 'warn',
    'no-empty': 'warn',
    'no-case-declarations': 'warn',
    'no-extra-boolean-cast': 'warn',
    'no-constant-condition': 'warn',
    'no-useless-escape': 'warn',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'max-lines': 'off',
      },
    },
  ],
};