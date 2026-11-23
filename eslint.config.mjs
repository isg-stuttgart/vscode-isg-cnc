import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';

export default [
    {
        ignores: [
            '**/out/**',
            '**/dist/**',
            '**/*.d.ts',
            'server/src/parserGenerating/ncParser.ts',
            'server/src/parserGenerating/generateParser.js',
            'server/src/parserGenerating/debugParser.ts'
        ]
    },
    {
        files: ['**/*.ts'],
        linterOptions: {
            reportUnusedDisableDirectives: 'off'
        },
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': typescriptPlugin,
            '@stylistic': stylistic
        },
        rules: {
            '@typescript-eslint/naming-convention': [
                'warn',
                { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow', trailingUnderscore: 'allow' },
                { selector: 'import', format: ['camelCase', 'PascalCase'] },
                { selector: 'variable', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'allow', trailingUnderscore: 'allow' },
                { selector: 'typeLike', format: ['PascalCase'] },
                { selector: 'property', modifiers: ['requiresQuotes'], format: null }
            ],
            '@stylistic/semi': 'warn',
            'curly': 'warn',
            'eqeqeq': 'warn',
            'no-throw-literal': 'warn',
            'no-unused-expressions': 'warn',
            'no-unused-vars': ['warn', { caughtErrors: 'none' }],
            'no-unsafe-finally': 'warn',
            'no-empty': 'warn',
            'semi': 'off'
        }
    }
];