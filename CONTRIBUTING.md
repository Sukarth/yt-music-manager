# Contributing to YT Music Manager

Thank you for considering contributing to YT Music Manager! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/yt-music-manager.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit and push
7. Create a Pull Request

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Git

### Installation
```bash
npm install
npm start
```

## Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type when possible
- Use strict mode

### React/React Native
- Use functional components with hooks
- Follow React best practices
- Use meaningful component names
- Keep components small and focused

### Naming Conventions
- Components: PascalCase (e.g., `PlaylistCard`)
- Files: PascalCase for components, camelCase for utilities
- Variables/Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Interfaces/Types: PascalCase with descriptive names

### Code Formatting
- Run `npm run format` before committing
- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in objects/arrays

### Comments
- Write self-documenting code
- Add comments for complex logic
- Use JSDoc for public functions
- Avoid obvious comments

## Testing

### Writing Tests
- Write tests for all new features
- Maintain >70% code coverage
- Follow AAA pattern (Arrange, Act, Assert)
- Use descriptive test names

### Running Tests
```bash
npm test                # Run all tests
npm run test:coverage   # Run with coverage
npm run test:watch      # Watch mode
```

## Commit Messages

### Format
```
type(scope): subject

body (optional)

footer (optional)
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```
feat(playlist): add playlist search functionality

fix(download): resolve concurrent download race condition

docs(readme): update installation instructions
```

## Pull Request Process

### Before Submitting
1. Ensure all tests pass
2. Update documentation
3. Run linting and formatting
4. Add/update tests
5. Rebase on latest main branch

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed

## Checklist
- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process
1. Automated CI/CD checks must pass
2. At least one maintainer review required
3. Address review comments
4. Maintainer will merge when approved

## Issue Reporting

### Bug Reports
Include:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Device/OS information
- App version

### Feature Requests
Include:
- Clear use case
- Proposed solution
- Alternatives considered
- Impact assessment

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `hotfix/*`: Critical production fixes

### Merging Strategy
- Squash commits for feature branches
- Keep commit history clean
- Rebase instead of merge when possible

## Code Review Guidelines

### For Authors
- Keep PRs focused and small
- Provide context in description
- Respond to comments promptly
- Test thoroughly before requesting review

### For Reviewers
- Be constructive and respectful
- Focus on code quality and maintainability
- Check for test coverage
- Verify documentation updates

## Performance Considerations

- Avoid unnecessary re-renders
- Optimize large lists with virtualization
- Lazy load heavy components
- Monitor bundle size
- Profile performance regularly

## Security Guidelines

- Never commit sensitive data
- Use environment variables
- Follow OWASP guidelines
- Sanitize user inputs
- Use secure storage for tokens

## Documentation

### Code Documentation
- JSDoc for public APIs
- Inline comments for complex logic
- README for setup instructions
- Architecture docs for design decisions

### Updating Documentation
- Update README.md for user-facing changes
- Update ARCHITECTURE.md for design changes
- Add API documentation for new endpoints
- Include migration guides for breaking changes

## Release Process

### Version Numbering
Follow Semantic Versioning (SemVer):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Release Checklist
1. Update version in package.json
2. Update CHANGELOG.md
3. Run full test suite
4. Build and test on both platforms
5. Create release tag
6. Deploy to stores (if applicable)

## Community

### Getting Help
- GitHub Issues for bugs and features
- Discussions for questions and ideas
- Stack Overflow for technical questions

### Communication
- Be respectful and professional
- Stay on topic
- Help others when possible
- Follow project guidelines

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing, please open an issue with the `question` label.

---

Thank you for contributing to YT Music Manager! 🎵
