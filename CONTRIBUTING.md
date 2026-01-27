# Contributing to Dynamo CMS

Thank you for your interest in contributing to Dynamo CMS! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Set up the backend**
   ```bash
   cd apps/backend
   dotnet restore
   dotnet build
   ```

3. **Set up the frontend**
   ```bash
   cd apps/frontend
   npm install
   ```

4. **Configure the database**
   - Update the connection string in `apps/backend/src/Dynamo.CMS.API/appsettings.json`
   - Run migrations: `dotnet ef database update --project src/Dynamo.CMS.API`

## Code Style

- Follow the `.editorconfig` settings at the root of the repository
- Backend: Follow C# coding conventions
- Frontend: Follow Angular style guide and TypeScript best practices
- Use meaningful commit messages

## Making Changes

1. **Create a branch** for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in the appropriate `apps/` subdirectory

3. **Run tests** to ensure everything works
   - Backend: `cd apps/backend && dotnet test`
   - Frontend: `cd apps/frontend && npm test`

4. **Commit your changes** with clear, descriptive messages

5. **Push and create a pull request**

## Project Structure

- `apps/backend/` - .NET Core API backend
- `apps/frontend/` - Angular frontend application
- Root level - Shared configuration files

## Testing

- Write tests for new features
- Ensure all existing tests pass
- Aim for good test coverage

## Questions?

If you have questions, please open an issue or contact the maintainers.
