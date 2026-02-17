# CLAUDE.md - Work-Dashboard

This file provides context and conventions for AI assistants working on this repository.

## Project Overview

**Work-Dashboard** is a dashboard application. The repository is currently in its **initial setup phase** — no application code, dependencies, or build tooling have been added yet. The only file present (besides `.git/`) is this `CLAUDE.md`.

## Repository Structure

```
Work-Dashboard/
├── CLAUDE.md          # AI assistant guidelines (this file)
└── .git/              # Git repository metadata
```

This project has no source code, configuration files, or dependencies yet. When adding the initial project scaffolding, update this section to reflect the chosen structure.

## Tech Stack

No tech stack has been chosen yet. When initializing the project, update these entries:

- **Framework:** Not yet chosen
- **Language:** Not yet chosen
- **Build Tool:** Not yet chosen
- **Package Manager:** Not yet chosen
- **Testing:** Not yet chosen
- **Linting/Formatting:** Not yet chosen
- **Styling:** Not yet chosen

## Development Setup

No dependencies or build steps exist yet. Once the project is scaffolded:

1. Document the install command (e.g., `npm install`)
2. Document how to start the dev server
3. Document any required environment variables

## Common Commands

No scripts are defined yet. Update this section when `package.json` (or equivalent) is created.

```bash
# Placeholder — replace once scripts exist:
# npm run dev       # Start development server
# npm run build     # Production build
# npm test          # Run tests
# npm run lint      # Lint code
# npm run format    # Format code
```

## Git Workflow

- **Default branch:** `master`
- **Remote:** `origin` points to `HAEGroup/Work-Dashboard`
- Use descriptive commit messages in imperative mood (e.g., "Add user authentication")
- Feature branches follow the pattern: `feature/<description>` or `claude/<session-id>`
- Keep commits focused and atomic — one logical change per commit

## Code Conventions

### General

- Prefer clarity over cleverness
- Keep functions small and single-purpose
- Use meaningful variable and function names
- Avoid premature abstraction — wait until patterns emerge before creating shared utilities
- Delete unused code rather than commenting it out

### File Naming

Establish and document naming conventions here once the project structure is in place. Suggested defaults:

- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities/modules: camelCase (e.g., `formatDate.ts`)
- Constants: SCREAMING_SNAKE_CASE for exported constant values
- Test files: `<filename>.test.<ext>` or `<filename>.spec.<ext>`

### Imports

- Group imports: external libraries first, then internal modules, then relative imports
- Use absolute imports where configured (e.g., `@/components/...`)

## Testing Guidelines

No testing framework is configured yet. When one is added:

- Write tests for business logic and critical paths
- Place test files adjacent to the code they test, or in a dedicated `tests/` directory
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern

## Environment Variables

No environment variables are required yet. When they are introduced:

- Document each variable, its purpose, whether it's required, and its default value
- Never commit secrets or credentials to the repository
- Use `.env.example` to document required variables (without actual values)

## AI Assistant Guidelines

When working on this codebase:

1. **Read before writing** — Always read existing files before making modifications
2. **Follow existing patterns** — Match the style and conventions already present in the code
3. **Minimal changes** — Only modify what is necessary to accomplish the task
4. **No over-engineering** — Avoid adding features, abstractions, or error handling beyond what is requested
5. **Update this file** — When introducing new conventions, dependencies, or structural changes, update this CLAUDE.md accordingly
6. **Test your changes** — Run the test suite after making changes (once tests exist)
7. **Check the build** — Verify the project builds successfully after changes
8. **Security first** — Never introduce secrets, credentials, or known vulnerabilities
9. **Scaffold thoughtfully** — Since this repo is empty, the first major task will be choosing a tech stack and scaffolding the project. Document all choices in this file as they are made
