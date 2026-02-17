# CLAUDE.md - Work-Dashboard

This file provides context and conventions for AI assistants working on this repository.

## Project Overview

**Work-Dashboard** is a dashboard application. This repository is in its initial setup phase.

## Repository Structure

```
Work-Dashboard/
├── CLAUDE.md          # AI assistant guidelines (this file)
└── .git/              # Git repository metadata
```

> **Note:** This project is newly initialized. Update this section as directories and files are added.

### Expected Structure (update as project evolves)

As the project grows, document new directories here:

<!-- Example (uncomment and modify as applicable):
├── src/               # Application source code
│   ├── components/    # Reusable UI components
│   ├── pages/         # Page-level components / routes
│   ├── services/      # API clients and external service integrations
│   ├── utils/         # Shared utility functions
│   ├── hooks/         # Custom React hooks (if React)
│   ├── store/         # State management
│   └── styles/        # Global styles and theme
├── public/            # Static assets
├── tests/             # Test files
├── .github/           # CI/CD workflows
└── docs/              # Documentation
-->

## Tech Stack

> **Note:** Update this section once the tech stack is chosen and dependencies are installed.

- **Framework:** TBD
- **Language:** TBD
- **Build Tool:** TBD
- **Package Manager:** TBD
- **Testing:** TBD
- **Linting/Formatting:** TBD
- **Styling:** TBD

## Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd Work-Dashboard

# Install dependencies (update command based on package manager)
# npm install
# yarn install
# pnpm install
```

## Common Commands

> **Note:** Update this section once package.json scripts are defined.

```bash
# Development server
# npm run dev

# Build for production
# npm run build

# Run tests
# npm test

# Lint code
# npm run lint

# Format code
# npm run format
```

## Git Workflow

- **Default branch:** `main` (or update if different)
- Use descriptive commit messages in imperative mood (e.g., "Add user authentication")
- Feature branches should follow the pattern: `feature/<description>` or `claude/<session-id>`
- Keep commits focused and atomic — one logical change per commit

## Code Conventions

### General

- Prefer clarity over cleverness
- Keep functions small and single-purpose
- Use meaningful variable and function names
- Avoid premature abstraction — wait until patterns emerge before creating shared utilities
- Delete unused code rather than commenting it out

### File Naming

> **Note:** Establish and document naming conventions here once the project structure is in place.

<!-- Example conventions (uncomment and modify):
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Constants: SCREAMING_SNAKE_CASE for values, camelCase for files
- Test files: `<filename>.test.ts` or `<filename>.spec.ts`
- Style files: match component name (e.g., `UserProfile.module.css`)
-->

### Imports

- Group imports: external libraries first, then internal modules, then relative imports
- Use absolute imports where configured (e.g., `@/components/...`)

## Testing Guidelines

> **Note:** Update once testing framework is configured.

- Write tests for business logic and critical paths
- Place test files adjacent to the code they test, or in a dedicated `tests/` directory
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern

## Environment Variables

> **Note:** Document required environment variables here as they are introduced.

<!-- Example:
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `API_URL` | Backend API base URL | Yes | — |
| `NODE_ENV` | Environment mode | No | `development` |
-->

- Never commit secrets or credentials to the repository
- Use `.env.example` to document required variables (without actual values)

## AI Assistant Guidelines

When working on this codebase:

1. **Read before writing** — Always read existing files before making modifications
2. **Follow existing patterns** — Match the style and conventions already present in the code
3. **Minimal changes** — Only modify what is necessary to accomplish the task
4. **No over-engineering** — Avoid adding features, abstractions, or error handling beyond what is requested
5. **Update this file** — When introducing new conventions, dependencies, or structural changes, update CLAUDE.md accordingly
6. **Test your changes** — Run the test suite after making changes (once tests exist)
7. **Check the build** — Verify the project builds successfully after changes
8. **Security first** — Never introduce secrets, credentials, or known vulnerabilities
