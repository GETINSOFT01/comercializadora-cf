module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  
  // JSX specific
  jsxSingleQuote: true,
  jsxBracketSameLine: false,
  
  // Other formatting options
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  
  // File-specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
    {
      files: '*.{ts,tsx}',
      options: {
        parser: 'typescript',
      },
    },
    {
      files: '*.{js,jsx}',
      options: {
        parser: 'babel',
      },
    },
  ],
};
