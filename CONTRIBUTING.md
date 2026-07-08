# Contributing to InnoVision

Thank you for your interest in contributing to InnoVision! 🎉 We're excited to have you as part of our community. This document provides guidelines and instructions for contributing to this project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Be respectful and constructive in communication
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** or **pnpm**
- **Git**
- A code editor (VS Code recommended)

---

### First-Time Contributors

If you're new to open source, here are some good first issues to get started:

1. Look for issues labeled `good first issue` or `beginner-friendly`
2. Read through the project documentation
3. Set up the development environment
4. Make your first contribution!

---

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- **Clear title**: Describe the bug briefly
- **Description**: Detailed explanation of the issue
- **Steps to reproduce**: How to recreate the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots**: If applicable
- **Environment**: Browser, OS, Node version, etc.

---

### Suggesting Features

We welcome feature suggestions! Please create an issue with:

- **Feature title**: Clear, concise name
- **Problem statement**: What problem does this solve?
- **Proposed solution**: How would you implement it?
- **Alternatives**: Other approaches you've considered
- **Additional context**: Screenshots, mockups, examples

---

### Contributing Code

1. **Fork the repository**

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Innovision-AI-Courses.git
   cd Innovision-AI-Courses
   ```

3. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes**

5. **Test your changes**

6. **Commit your changes**

7. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create a Pull Request**

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```
---

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Gemini API
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```
---

### 3. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 4. Build for Production

```bash
npm run build
npm start
```
---

## Project Structure

```
InnoVision/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # Reusable React components
│   ├── contexts/         # React context providers
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utility functions and configurations
├── public/               # Static assets
├── README.md             # Project documentation
└── package.json          # Dependencies and scripts
```
---

### Key Directories

- **`src/app/`**: Page routes and layouts
- **`src/components/`**: UI components organized by feature
- **`src/contexts/`**: Global state management (Auth, XP, Theme)
- **`src/lib/`**: Firebase config, data files, utilities

---

## Coding Standards

### JavaScript/React Guidelines

- Use **functional components** with hooks
- Follow **ES6+** syntax
- Use **async/await** instead of promises where possible
- Keep components small and focused (single responsibility)
- Use **PropTypes** or **TypeScript** for type checking

---

### File Naming

- Components: `PascalCase.jsx` (e.g., `UserProfile.jsx`)
- Utilities: `camelCase.js` (e.g., `formatDate.js`)
- Hooks: `useCamelCase.js` (e.g., `useAuth.js`)
- Context: `camelCase.jsx` (e.g., `auth.jsx`)

---

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Optional but consistent
- **Line length**: Max 100 characters
- **Comments**: Use JSDoc for functions

```javascript
/**
 * Calculate user's XP progress percentage
 * @param {number} currentXP - User's current XP
 * @param {number} requiredXP - XP needed for next level
 * @returns {number} Progress percentage (0-100)
 */
function calculateProgress(currentXP, requiredXP) {
  return Math.min((currentXP / requiredXP) * 100, 100);
}
```
---

### React Best Practices

```jsx
// ✅ Good
import { useState, useEffect } from 'react';

export default function MyComponent({ title, onClose }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Effect logic
  }, []);

  return (
    <div className="container">
      <h1>{title}</h1>
    </div>
  );
}

// ❌ Avoid
function mycomponent(props) {
  var isOpen = false;
  return <div><h1>{props.title}</h1></div>
}
```
---

### Styling

- Use **Tailwind CSS** utility classes
- Use `className` for conditional styling
- Keep custom CSS minimal
- Follow mobile-first responsive design

```jsx
// ✅ Good
<div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
  <h2 className="text-xl font-bold">Title</h2>
</div>
```
---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```
---

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

---

### Examples

```bash
feat(gamification): add streak counter component

fix(auth): resolve Firebase auth state persistence issue

docs(readme): update installation instructions

refactor(api): simplify course generation logic

style(navbar): improve mobile responsive layout
```
---

### Commit Message Rules

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Keep subject line under 50 characters
- Capitalize first letter of subject
- No period at the end of subject
- Separate subject from body with blank line
- Wrap body at 72 characters
- Explain **what** and **why**, not **how**

---

## Pull Request Process

### Before Submitting

1. ✅ Ensure your code follows the coding standards
2. ✅ Run the development server and test your changes
3. ✅ Update documentation if needed
4. ✅ Add comments for complex logic
5. ✅ Ensure no console errors or warnings
6. ✅ Check responsiveness (mobile, tablet, desktop)

---

### PR Title Format

Use the same format as commit messages:

```
feat(component): add new feature
fix(api): resolve bug in endpoint
```
---

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #issue_number

## Screenshots (if applicable)
[Add screenshots here]

## Testing
How did you test this?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed the code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Tested on multiple browsers
```
---

### Review Process

1. At least one maintainer will review your PR
2. Address any requested changes
3. Once approved, a maintainer will merge your PR
4. Your contribution will be credited in the release notes

---

## Testing

### Manual Testing

Before submitting, test:

1. **Authentication**: Login/logout functionality
2. **Navigation**: All routes work correctly
3. **Responsive Design**: Mobile, tablet, desktop views
4. **Dark Mode**: Toggle between light/dark themes
5. **Features**: Test the specific feature you modified

---

### Browser Testing

Test on:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

### Mobile Testing

- iOS Safari
- Chrome Mobile
- Responsive mode in DevTools

---

## Documentation

### When to Update Documentation

Update documentation when:

- Adding new features
- Changing existing functionality
- Adding new API endpoints
- Modifying environment variables
- Changing dependencies

---

### Documentation Files

- **README.md**: Project overview and setup
- **CONTRIBUTING.md**: This file
- **Code comments**: Inline documentation
- **JSDoc**: Function documentation

---

## Community

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Requests**: For code reviews and collaboration

---

### Recognition

Contributors will be recognized:

- Listed in the project README
- Mentioned in release notes
- Featured in the project website (if applicable)

---

### Communication

- Be patient and respectful
- Provide constructive feedback
- Help others when you can
- Celebrate successes together

---

## Development Tips

### Useful Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Format code (if prettier is configured)
npm run format

# Lint code (if ESLint is configured)
npm run lint
```
---

### Debugging

- Use browser DevTools for client-side debugging
- Check browser console for errors
- Use React DevTools extension
- Check Network tab for API calls
- Review Firebase console for backend issues

---

### Common Issues

**Issue**: Firebase authentication not working

**Solution**: Check `.env.local` has correct Firebase config

**Issue**: Gemini API errors

**Solution**: Verify API key is valid and has proper permissions

**Issue**: Styles not applying

**Solution**: Ensure Tailwind classes are correct, restart dev server

---

## Questions?

If you have questions not covered in this guide:

1. Check existing issues and discussions
2. Search the documentation
3. Ask in GitHub Discussions
4. Create a new issue with the `question` label

---

## Thank You! 🙏

Your contributions make InnoVision better for everyone. We appreciate your time and effort in helping improve this project.

**Happy Coding!** 🚀