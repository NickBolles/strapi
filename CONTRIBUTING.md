# Contributing to MCP Conductor

Thank you for your interest in contributing to MCP Conductor! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Basic knowledge of TypeScript and MCP (Model Context Protocol)

### Development Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/your-username/mcp-conductor.git
   cd mcp-conductor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Create configuration**:
   ```bash
   npm run init
   # Edit config/conductor.yaml
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
src/
├── core/           # Core orchestration logic
├── mcp/            # MCP client implementations
├── config/         # Configuration management
├── security/       # Authentication and security
├── orchestration/  # Workflow engine
├── plugins/        # Plugin system
├── web/            # Web interface
├── cli/            # Command-line interface
└── utils/          # Shared utilities

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── e2e/            # End-to-end tests

docs/               # Documentation
config/             # Configuration examples
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- config-loader.test.ts

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for all new functionality
- Use descriptive test names
- Follow the existing test patterns
- Mock external dependencies
- Aim for high test coverage

Example test structure:
```typescript
describe('ComponentName', () => {
  let component: ComponentName;

  beforeEach(() => {
    component = new ComponentName();
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

## 📝 Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Define interfaces for all data structures
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Follow existing naming conventions

### Formatting

We use Prettier and ESLint for code formatting:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:
```
feat(workflow): add conditional step execution
fix(mcp): handle server connection timeouts
docs(setup): update installation instructions
```

## 🔌 Adding New Integrations

### Creating an MCP Server Integration

1. **Create integration directory**:
   ```
   src/integrations/your-service/
   ├── server.ts
   ├── types.ts
   └── README.md
   ```

2. **Implement the MCP server**:
   ```typescript
   export class YourServiceMCPServer {
     // Implementation
   }
   ```

3. **Add configuration schema**:
   ```typescript
   // Add to src/config/schema.ts
   ```

4. **Write tests**:
   ```
   tests/integration/your-service.test.ts
   ```

5. **Update documentation**:
   - Add setup instructions
   - Update configuration examples
   - Add to supported integrations list

### Plugin Development

1. **Create plugin structure**:
   ```
   plugins/your-plugin/
   ├── index.ts
   ├── package.json
   └── README.md
   ```

2. **Implement plugin interface**:
   ```typescript
   export class YourPlugin implements Plugin {
     // Implementation
   }
   ```

3. **Add plugin documentation**

## 🌐 Web Interface Development

The web interface is built with:
- Express.js for the backend API
- HTML/CSS/JavaScript for the frontend
- WebSocket for real-time updates

### Adding New API Endpoints

1. **Create route handler**:
   ```typescript
   // src/web/routes/your-route.ts
   ```

2. **Add to main router**:
   ```typescript
   // src/web/server.ts
   ```

3. **Write tests**:
   ```typescript
   // tests/integration/web/your-route.test.ts
   ```

## 📚 Documentation

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add screenshots for UI features
- Keep documentation up to date with code changes

### Documentation Structure

- `README.md`: Project overview and quick start
- `docs/setup.md`: Detailed setup instructions
- `docs/configuration.md`: Configuration reference
- `docs/workflows.md`: Workflow creation guide
- `docs/plugins.md`: Plugin development guide
- `docs/api-reference.md`: API documentation

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment information**:
   - Node.js version
   - Operating system
   - MCP Conductor version

2. **Steps to reproduce**:
   - Clear, numbered steps
   - Expected vs actual behavior

3. **Logs and error messages**:
   - Relevant log entries
   - Stack traces
   - Configuration (sanitized)

4. **Additional context**:
   - Screenshots if applicable
   - Related issues or PRs

## 💡 Feature Requests

For feature requests:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** and problem being solved
3. **Propose a solution** if you have ideas
4. **Consider implementation complexity**
5. **Be open to discussion** and alternative approaches

## 🔄 Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation

3. **Test your changes**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Commit your changes**:
   ```bash
   git commit -m "feat: add your feature"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **PR Requirements**:
   - Clear description of changes
   - Link to related issues
   - All tests passing
   - Documentation updated
   - Code review approval

## 🏷️ Release Process

Releases follow semantic versioning (semver):

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

## 📞 Getting Help

- 💬 [GitHub Discussions](https://github.com/your-org/mcp-conductor/discussions)
- 🐛 [Issue Tracker](https://github.com/your-org/mcp-conductor/issues)
- 📧 [Email](mailto:contributors@mcp-conductor.dev)

## 📄 License

By contributing to MCP Conductor, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to MCP Conductor! 🎼✨

