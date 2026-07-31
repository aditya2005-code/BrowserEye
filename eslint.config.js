export default [
  {
    ignores: [
      '**/dist/',
      '**/node_modules/',
      '**/prisma/',
      'eslint.config.js'
    ]
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { 'avoidEscape': true }]
    }
  }
];
