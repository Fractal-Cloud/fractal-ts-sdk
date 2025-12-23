# Contributing to fractal-ts-sdk
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

Thank you for your interest in contributing to the Fractal Cloud TypeScript SDK! We welcome contributions from the community to help make this SDK better.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** to your local machine:
    ```bash
    git clone https://github.com/your-username/fractal-ts-sdk.git
    cd fractal-ts-sdk
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```

## Development Workflow

### Project Structure
- `src/`: Contains the source code.
- `src/values/`: Value objects and utility types.
- `src/fractal/` & `src/live-system/`: Core SDK logic.

### Building
To build the project using `tsup`:

```bash 
npm run build
```

To run the build in watch mode during development:

```bash
npm run dev
```

### Running Tests
We use `vitest` for testing. Please ensure all tests pass before submitting a pull request.

To run tests once:

```bash 
npm run test
```

To run tests in watch mode:

```bash 
npm run test:watch
```

### Linting
We use [Google TypeScript Style (gts)](https://github.com/google/gts) to maintain code quality. Note that `npm run test` will automatically run the linter afterwards.

To check for linting issues:
```bash
npm run lint
```

To automatically fix most linting issues:
```bash
npm run lint:fix
```

### Documentation
Documentation is generated using `TypeDoc`. To build the documentation:

```bash
npm run build:docs
```

## Pull Request Guidelines

1.  **Branch Naming**: Use descriptive branch names (e.g., `feat/add-new-service` or `fix/issue-123`).
2.  **Code Style**: We follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html). Ensure your code adheres to these standards and remains clean and well-commented.
3.  **Tests**: Include tests for any new features or bug fixes.
4.  **Commit Messages**: Use clear and concise commit messages.
5.  **Documentation**: Update the README or inline JSDoc if your changes affect the public API.

## License
By contributing to this project, you agree that your contributions will be licensed under the [GPL-3.0-or-later](LICENSE) license.
