module.exports = {
  // TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // JSON files
  '*.json': [
    'prettier --write',
  ],
  
  // CSS and SCSS files
  '*.{css,scss,sass}': [
    'prettier --write',
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write',
  ],
  
  // Test files - run tests for changed files
  '*.{test,spec}.{ts,tsx}': [
    'npm run test -- --findRelatedTests --passWithNoTests',
  ],
  
  // Package.json - validate and sort
  'package.json': [
    'prettier --write',
  ],
};
