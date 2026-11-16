import tseslint from 'typescript-eslint';

const simOnlyContent =
  'sim импортирует только content: ядро должно работать без рендера, интерфейса и DOM.';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
  },
  {
    files: ['packages/sim/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@factory/render', '@factory/render/**', '@factory/app', '@factory/app/**'],
              message: simOnlyContent,
            },
            {
              regex: '^(\\.\\./)+(render|app)(/|$)',
              message: simOnlyContent,
            },
          ],
        },
      ],
    },
  },
);
